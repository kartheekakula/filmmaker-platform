import { SupabaseClient } from "@supabase/supabase-js";
import { Film, FilmWithCreator, FilmInput, FeaturedFilm } from "@/lib/types";

/**
 * Extracts standard 11-char YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

/**
 * Returns formatted mm:ss from seconds
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parses "mm:ss" or "m:ss" into integer seconds
 */
export function parseDuration(val: string): number | null {
  const parts = val.trim().split(":");
  if (parts.length !== 2) return null;
  const mins = parseInt(parts[0], 10);
  const secs = parseInt(parts[1], 10);
  if (isNaN(mins) || isNaN(secs) || secs < 0 || secs >= 60 || mins < 0) {
    return null;
  }
  return mins * 60 + secs;
}

export interface FeedCursor {
  created_at: string;
  id: string;
}

export interface FeedResponse {
  films: FilmWithCreator[];
  nextCursor: FeedCursor | null;
  hasMore: boolean;
}

/**
 * Fetch films with cursor pagination, creator join, and optional category filter
 */
export async function getFilmsFeed(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
    categorySlug?: string | null;
    userId?: string | null;
  } = {}
): Promise<FeedResponse> {
  const limit = options.limit ?? 10;

  let query = supabase
    .from("films")
    .select(
      `
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      categories:category_slug (
        slug,
        name,
        sort_order
      )
    `
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.categorySlug) {
    query = query.eq("category_slug", options.categorySlug);
  }

  if (options.cursor) {
    // Cursor pagination on (created_at desc, id desc)
    query = query.or(
      `created_at.lt.${options.cursor.created_at},and(created_at.eq.${options.cursor.created_at},id.lt.${options.cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching films feed:", error);
    throw error;
  }

  const rawFilms = (data || []) as unknown as FilmWithCreator[];
  const hasMore = rawFilms.length > limit;
  const films = hasMore ? rawFilms.slice(0, limit) : rawFilms;

  // Check user likes if user is authenticated
  if (options.userId && films.length > 0) {
    const filmIds = films.map((f) => f.id);
    const { data: userLikes } = await supabase
      .from("likes")
      .select("film_id")
      .eq("user_id", options.userId)
      .in("film_id", filmIds);

    const likedSet = new Set((userLikes || []).map((l) => l.film_id));
    films.forEach((f) => {
      f.user_has_liked = likedSet.has(f.id);
    });
  }

  const lastItem = films[films.length - 1];
  const nextCursor: FeedCursor | null =
    hasMore && lastItem
      ? { created_at: lastItem.created_at, id: lastItem.id }
      : null;

  return {
    films,
    nextCursor,
    hasMore,
  };
}

/**
 * Fetch popular films of the last 7 days across all channels (sorted by like_count desc)
 */
export async function getPopularFilms(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    userId?: string | null;
  } = {}
): Promise<{ films: FilmWithCreator[]; hasMore: boolean }> {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("films")
    .select(
      `
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      categories:category_slug (
        slug,
        name,
        sort_order
      )
    `
    )
    .gte("created_at", sevenDaysAgo)
    .order("like_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("Error fetching popular films:", error);
    throw error;
  }

  const rawFilms = (data || []) as unknown as FilmWithCreator[];
  const hasMore = rawFilms.length > limit;
  const films = hasMore ? rawFilms.slice(0, limit) : rawFilms;

  if (options.userId && films.length > 0) {
    const filmIds = films.map((f) => f.id);
    const { data: userLikes } = await supabase
      .from("likes")
      .select("film_id")
      .eq("user_id", options.userId)
      .in("film_id", filmIds);

    const likedSet = new Set((userLikes || []).map((l) => l.film_id));
    films.forEach((f) => {
      f.user_has_liked = likedSet.has(f.id);
    });
  }

  return { films, hasMore };
}

/**
 * Fetch explore films:
 * Shows recent films from creators the signed-in user does not follow (or all recent films when signed out)
 */
export async function getExploreFilms(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
    userId?: string | null;
  } = {}
): Promise<FeedResponse> {
  const limit = options.limit ?? 10;

  let excludedUserIds: string[] = [];
  if (options.userId) {
    // Fetch accounts followed by current user
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", options.userId);

    const followingIds = (follows || []).map((f) => f.following_id);
    // Exclude following creators and optionally self
    excludedUserIds = Array.from(new Set([...followingIds, options.userId]));
  }

  let query = supabase
    .from("films")
    .select(
      `
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      categories:category_slug (
        slug,
        name,
        sort_order
      )
    `
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (excludedUserIds.length > 0) {
    // Use not in filter
    query = query.not("owner_id", "in", `(${excludedUserIds.join(",")})`);
  }

  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.created_at},and(created_at.eq.${options.cursor.created_at},id.lt.${options.cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching explore films:", error);
    throw error;
  }

  const rawFilms = (data || []) as unknown as FilmWithCreator[];
  const hasMore = rawFilms.length > limit;
  const films = hasMore ? rawFilms.slice(0, limit) : rawFilms;

  if (options.userId && films.length > 0) {
    const filmIds = films.map((f) => f.id);
    const { data: userLikes } = await supabase
      .from("likes")
      .select("film_id")
      .eq("user_id", options.userId)
      .in("film_id", filmIds);

    const likedSet = new Set((userLikes || []).map((l) => l.film_id));
    films.forEach((f) => {
      f.user_has_liked = likedSet.has(f.id);
    });
  }

  const lastItem = films[films.length - 1];
  const nextCursor: FeedCursor | null =
    hasMore && lastItem
      ? { created_at: lastItem.created_at, id: lastItem.id }
      : null;

  return {
    films,
    nextCursor,
    hasMore,
  };
}

/**
 * Fetch a single film by ID with creator profile
 */
export async function getFilmById(
  supabase: SupabaseClient,
  id: string,
  userId?: string | null
): Promise<FilmWithCreator | null> {
  const { data, error } = await supabase
    .from("films")
    .select(
      `
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      categories:category_slug (
        slug,
        name,
        sort_order
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const film = data as unknown as FilmWithCreator;

  if (userId) {
    const { data: likeData } = await supabase
      .from("likes")
      .select("film_id")
      .eq("film_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    film.user_has_liked = !!likeData;
  }

  return film;
}

/**
 * Toggle like for a film. Database triggers will maintain film.like_count.
 */
export async function toggleFilmLike(
  supabase: SupabaseClient,
  filmId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<{ liked: boolean }> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("film_id", filmId)
      .eq("user_id", userId);

    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({ film_id: filmId, user_id: userId });

    if (error) throw error;
    return { liked: true };
  }
}

/**
 * Safely increment view count via RPC
 */
export async function incrementFilmView(
  supabase: SupabaseClient,
  filmId: string
): Promise<void> {
  try {
    await supabase.rpc("increment_film_view", { p_film_id: filmId });
  } catch (err) {
    console.error("Failed to increment film view:", err);
  }
}

/**
 * Post a new film (1 to 180 seconds duration)
 */
export async function createFilm(
  supabase: SupabaseClient,
  userId: string,
  input: FilmInput
): Promise<Film> {
  if (input.duration_seconds < 1 || input.duration_seconds > 180) {
    throw new Error("Film duration must be between 1 and 180 seconds (3:00 max).");
  }

  if (!input.category_slug) {
    throw new Error("A channel category is required.");
  }

  const { data, error } = await supabase
    .from("films")
    .insert({
      owner_id: userId,
      title: input.title.trim(),
      caption: input.caption?.trim() || null,
      genre: input.genre?.trim() || null,
      language: input.language?.trim() || null,
      duration_seconds: input.duration_seconds,
      source_type: "youtube",
      video_url: input.video_url.trim(),
      youtube_id: input.youtube_id,
      thumbnail_url:
        input.thumbnail_url ||
        `https://img.youtube.com/vi/${input.youtube_id}/hqdefault.jpg`,
      preview_start_seconds: input.preview_start_seconds || 0,
      category_slug: input.category_slug,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating film:", error);
    throw error;
  }

  return data as Film;
}

/**
 * Fetch films belonging to a specific user (for Activity or Featured Picker)
 */
export async function getUserFilms(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<Film[]> {
  const { data, error } = await supabase
    .from("films")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching user films:", error);
    return [];
  }

  return (data || []) as Film[];
}

/**
 * Fetch featured films for a profile
 */
export async function getFeaturedFilms(
  supabase: SupabaseClient,
  profileId: string
): Promise<FeaturedFilm[]> {
  const { data, error } = await supabase
    .from("featured_films")
    .select(
      `
      profile_id,
      film_id,
      position,
      films:film_id (
        id,
        owner_id,
        title,
        caption,
        genre,
        language,
        duration_seconds,
        source_type,
        video_url,
        youtube_id,
        thumbnail_url,
        preview_start_seconds,
        category_slug,
        like_count,
        view_count,
        created_at
      )
    `
    )
    .eq("profile_id", profileId)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching featured films:", error);
    return [];
  }

  return (data || []) as unknown as FeaturedFilm[];
}

/**
 * Update featured films (positions 1, 2, 3) for the authenticated owner
 */
export async function updateFeaturedFilms(
  supabase: SupabaseClient,
  profileId: string,
  filmIds: string[]
): Promise<void> {
  const clampedIds = filmIds.slice(0, 3);

  // Remove existing featured films
  const { error: deleteError } = await supabase
    .from("featured_films")
    .delete()
    .eq("profile_id", profileId);

  if (deleteError) throw deleteError;

  if (clampedIds.length === 0) return;

  const rows = clampedIds.map((id, index) => ({
    profile_id: profileId,
    film_id: id,
    position: index + 1,
  }));

  const { error: insertError } = await supabase
    .from("featured_films")
    .insert(rows);

  if (insertError) throw insertError;
}

/**
 * Fetch all categories
 */
export async function getCategories(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data || [];
}
