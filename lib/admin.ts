import { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/constants";

export type AdminTimeframe = "24h" | "7d" | "30d" | "all";

export interface PlatformMetrics {
  timeframe: AdminTimeframe;
  totalSignups: number;
  newSignups: number;
  totalPosts: number;
  newPosts: number;
  totalVideos: number;
  newVideos: number;
  openReports: number;
  hiddenPosts: number;
  restrictedUsers: number;
  postsByType: {
    video: number;
    writing: number;
    image: number;
  };
  postsByChannel: Record<string, number>;
}

export interface DetailedReportQueueItem {
  film_id: string;
  title: string;
  post_type: "video" | "writing" | "image";
  thumbnail_url: string | null;
  caption: string | null;
  body: string | null;
  youtube_id: string | null;
  media_urls: string[];
  category_slug: string;
  created_at: string;
  owner_id: string;
  owner_username: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
  report_count: number;
  reason_counts: {
    spam?: number;
    off_topic?: number;
    abuse?: number;
    other?: number;
    [key: string]: number | undefined;
  };
  latest_report_at: string;
}

export interface IndividualReport {
  id: string;
  film_id: string;
  reporter_id: string;
  reason: "spam" | "off_topic" | "abuse" | "other";
  status: "open" | "dismissed" | "actioned";
  created_at: string;
  reporter_username: string;
  reporter_display_name: string | null;
  reporter_avatar_url: string | null;
}

export interface HiddenPostItem {
  id: string;
  title: string;
  post_type: "video" | "writing" | "image";
  thumbnail_url: string | null;
  youtube_id: string | null;
  media_urls: string[];
  caption: string | null;
  body: string | null;
  category_slug: string;
  created_at: string;
  hidden_reason: string | null;
  owner_id: string;
  owner_username: string;
  owner_display_name: string | null;
}

export interface RestrictedUserItem {
  user_id: string;
  created_at: string;
  created_by: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Calculates start ISO string based on selected timeframe
 */
export function getTimeframeThreshold(timeframe: AdminTimeframe): string | null {
  const now = new Date();
  if (timeframe === "24h") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
  if (timeframe === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (timeframe === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

/**
 * Fetch platform activity metrics using real DB queries with exact counts
 */
export async function getAdminPlatformMetrics(
  supabase: SupabaseClient,
  timeframe: AdminTimeframe
): Promise<PlatformMetrics> {
  const thresholdIso = getTimeframeThreshold(timeframe);

  // Parallel count queries for overall stats
  const [
    totalSignupsRes,
    newSignupsRes,
    totalPostsRes,
    newPostsRes,
    totalVideosRes,
    newVideosRes,
    openReportsRes,
    hiddenPostsRes,
    restrictedUsersRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    thresholdIso
      ? supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thresholdIso)
      : supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("films").select("*", { count: "exact", head: true }),
    thresholdIso
      ? supabase.from("films").select("*", { count: "exact", head: true }).gte("created_at", thresholdIso)
      : supabase.from("films").select("*", { count: "exact", head: true }),
    supabase.from("films").select("*", { count: "exact", head: true }).eq("post_type", "video"),
    thresholdIso
      ? supabase
          .from("films")
          .select("*", { count: "exact", head: true })
          .eq("post_type", "video")
          .gte("created_at", thresholdIso)
      : supabase.from("films").select("*", { count: "exact", head: true }).eq("post_type", "video"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("films").select("*", { count: "exact", head: true }).eq("is_hidden", true),
    supabase.from("restrictions").select("*", { count: "exact", head: true }),
  ]);

  // Breakdown queries by post_type and category within timeframe
  let breakdownQuery = supabase
    .from("films")
    .select("post_type, category_slug");

  if (thresholdIso) {
    breakdownQuery = breakdownQuery.gte("created_at", thresholdIso);
  }

  const { data: breakdownData } = await breakdownQuery;

  const postsByType = {
    video: 0,
    writing: 0,
    image: 0,
  };

  const postsByChannel: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    postsByChannel[cat.slug] = 0;
  }

  if (breakdownData) {
    for (const item of breakdownData) {
      const type = item.post_type as "video" | "writing" | "image";
      if (type === "video" || type === "writing" || type === "image") {
        postsByType[type] = (postsByType[type] || 0) + 1;
      }
      if (item.category_slug) {
        postsByChannel[item.category_slug] = (postsByChannel[item.category_slug] || 0) + 1;
      }
    }
  }

  return {
    timeframe,
    totalSignups: totalSignupsRes.count ?? 0,
    newSignups: newSignupsRes.count ?? 0,
    totalPosts: totalPostsRes.count ?? 0,
    newPosts: newPostsRes.count ?? 0,
    totalVideos: totalVideosRes.count ?? 0,
    newVideos: newVideosRes.count ?? 0,
    openReports: openReportsRes.count ?? 0,
    hiddenPosts: hiddenPostsRes.count ?? 0,
    restrictedUsers: restrictedUsersRes.count ?? 0,
    postsByType,
    postsByChannel,
  };
}

/**
 * Load reported queue items enriched with film and creator details
 */
export async function getDetailedReportQueue(
  supabase: SupabaseClient
): Promise<DetailedReportQueueItem[]> {
  const { data: queueData, error: queueError } = await supabase.rpc("admin_report_queue");
  if (queueError || !queueData || queueData.length === 0) {
    return [];
  }

  const filmIds = queueData.map((item: { film_id: string }) => item.film_id);

  // Batch load film details
  const { data: filmsData } = await supabase
    .from("films")
    .select(`
      id,
      caption,
      body,
      youtube_id,
      media_urls,
      category_slug,
      created_at,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .in("id", filmIds);

  const filmsMap = new Map<string, any>();
  if (filmsData) {
    for (const f of filmsData) {
      filmsMap.set(f.id, f);
    }
  }

  return queueData.map((item: any) => {
    const film = filmsMap.get(item.film_id);
    const profile = film?.profiles;
    return {
      film_id: item.film_id,
      title: item.title,
      post_type: item.post_type || "video",
      thumbnail_url: item.thumbnail_url,
      caption: film?.caption ?? null,
      body: film?.body ?? null,
      youtube_id: film?.youtube_id ?? null,
      media_urls: film?.media_urls ?? [],
      category_slug: film?.category_slug ?? "",
      created_at: film?.created_at ?? item.latest_report_at,
      owner_id: item.owner_id,
      owner_username: item.owner_username,
      owner_display_name: profile?.display_name ?? null,
      owner_avatar_url: profile?.avatar_url ?? null,
      report_count: Number(item.report_count ?? 1),
      reason_counts: item.reason_counts ?? {},
      latest_report_at: item.latest_report_at,
    };
  });
}

/**
 * Fetch all individual reports for a specific film
 */
export async function getFilmReports(
  supabase: SupabaseClient,
  filmId: string
): Promise<IndividualReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(`
      id,
      film_id,
      reporter_id,
      reason,
      status,
      created_at,
      profiles:reporter_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("film_id", filmId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    film_id: r.film_id,
    reporter_id: r.reporter_id,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    reporter_username: r.profiles?.username ?? "unknown",
    reporter_display_name: r.profiles?.display_name ?? null,
    reporter_avatar_url: r.profiles?.avatar_url ?? null,
  }));
}

