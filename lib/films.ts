import { SupabaseClient } from "@supabase/supabase-js";
import { Film, FilmWithCreator, FilmInput, FeaturedFilm, Comment, ProfileTileFilm } from "@/lib/types";

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
 * Post a new film or creative work (video, writing, or image)
 */
export async function createFilm(
  supabase: SupabaseClient,
  userId: string,
  input: FilmInput
): Promise<Film> {
  const postType = input.post_type || "video";

  if (!input.title || !input.title.trim()) {
    throw new Error("Title is required.");
  }

  if (!input.category_slug) {
    throw new Error("A channel category is required.");
  }

  const payload: Record<string, unknown> = {
    owner_id: userId,
    title: input.title.trim(),
    caption: input.caption?.trim() || null,
    genre: null,
    language: null,
    category_slug: input.category_slug,
    post_type: postType,
  };

  if (postType === "video") {
    if (input.duration_seconds && (input.duration_seconds < 1 || input.duration_seconds > 180)) {
      throw new Error("Video duration must be 3 minutes or less.");
    }
    if (!input.video_url || !input.youtube_id) {
      throw new Error("Valid YouTube URL is required for video posts.");
    }
    payload.duration_seconds = input.duration_seconds || null;
    payload.source_type = "youtube";
    payload.video_url = input.video_url.trim();
    payload.youtube_id = input.youtube_id;
    payload.thumbnail_url =
      input.thumbnail_url ||
      `https://img.youtube.com/vi/${input.youtube_id}/hqdefault.jpg`;
    payload.preview_start_seconds = 0;
  } else if (postType === "writing") {
    if (!input.body || !input.body.trim()) {
      throw new Error("Writing content is required.");
    }
    payload.body = input.body.trim();
    payload.duration_seconds = null;
    payload.source_type = null;
    payload.video_url = null;
    payload.youtube_id = null;
    payload.thumbnail_url = null;
    payload.preview_start_seconds = 0;
  } else if (postType === "image") {
    if (!input.media_urls || input.media_urls.length === 0) {
      throw new Error("At least one image is required.");
    }
    if (input.media_urls.length > 4) {
      throw new Error("Maximum of 4 images allowed per post.");
    }
    payload.media_urls = input.media_urls;
    payload.thumbnail_url = input.media_urls[0];
    payload.duration_seconds = null;
    payload.source_type = null;
    payload.video_url = null;
    payload.youtube_id = null;
    payload.preview_start_seconds = 0;
  }

  const { data, error } = await supabase
    .from("films")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error creating post:", error);
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
 * Fetch a user's posts for square-tile grid with cursor pagination
 * Selects only tile columns: id, title, post_type, thumbnail_url, youtube_id, media_urls, created_at
 */
export async function getUserPosts(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit?: number;
    cursor?: FeedCursor | null;
  } = {}
): Promise<{ films: ProfileTileFilm[]; nextCursor: FeedCursor | null; hasMore: boolean }> {
  const limit = options.limit ?? 12;

  let query = supabase
    .from("films")
    .select("id, title, post_type, thumbnail_url, youtube_id, media_urls, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.created_at},and(created_at.eq.${options.cursor.created_at},id.lt.${options.cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching user posts:", error);
    return { films: [], nextCursor: null, hasMore: false };
  }

  const rawFilms = (data || []) as unknown as ProfileTileFilm[];
  const hasMore = rawFilms.length > limit;
  const films = hasMore ? rawFilms.slice(0, limit) : rawFilms;
  const lastItem = films[films.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? { created_at: lastItem.created_at, id: lastItem.id }
      : null;

  return { films, nextCursor, hasMore };
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
      films:film_id (*)
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

/**
 * Fetch comments for a film/post with cursor pagination
 */
export async function getFilmComments(
  supabase: SupabaseClient,
  filmId: string,
  options: {
    limit?: number;
    cursor?: { created_at: string; id: string } | null;
  } = {}
): Promise<{ comments: Comment[]; nextCursor: { created_at: string; id: string } | null; hasMore: boolean }> {
  const limit = options.limit ?? 20;
  let query = supabase
    .from("comments")
    .select(
      `
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("film_id", filmId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.or(
      `created_at.lt.${options.cursor.created_at},and(created_at.eq.${options.cursor.created_at},id.lt.${options.cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching comments:", error);
    return { comments: [], nextCursor: null, hasMore: false };
  }

  const items = (data || []) as Comment[];
  const hasMore = items.length > limit;
  const comments = hasMore ? items.slice(0, limit) : items;
  const nextCursor =
    hasMore && comments.length > 0
      ? { created_at: comments[comments.length - 1].created_at, id: comments[comments.length - 1].id }
      : null;

  return { comments, nextCursor, hasMore };
}

/**
 * Add a comment to a film/post
 */
export async function addFilmComment(
  supabase: SupabaseClient,
  filmId: string,
  authorId: string,
  body: string
): Promise<Comment> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }
  if (trimmed.length > 1000) {
    throw new Error("Comment cannot exceed 1000 characters.");
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      film_id: filmId,
      author_id: authorId,
      body: trimmed,
    })
    .select(
      `
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .single();

  if (error) {
    console.error("Error adding comment:", error);
    throw error;
  }

  return data as Comment;
}

/**
 * Delete a comment by author
 */
export async function deleteFilmComment(
  supabase: SupabaseClient,
  commentId: string,
  authorId: string
): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", authorId);

  if (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

