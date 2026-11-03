import { SupabaseClient } from "@supabase/supabase-js";
import {
  Festival,
  FestivalInput,
  FestivalKind,
  FestivalWorkMode,
  FestivalTab,
} from "./types";

export interface FestivalListOptions {
  search?: string | null;
  kind?: FestivalKind | null;
  workMode?: FestivalWorkMode | null;
  tab?: FestivalTab;
  savedOnly?: boolean;
  offset?: number;
  limit?: number;
}

/**
 * Lists festivals via list_festivals RPC.
 * Note: Offset pagination is acceptable here because this table is admin-curated and small.
 */
export async function getFestivals(
  supabase: SupabaseClient,
  options: FestivalListOptions = {}
): Promise<{ festivals: Festival[]; totalCount: number; hasMore: boolean }> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const { data, error } = await supabase.rpc("list_festivals", {
    p_search: options.search?.trim() || null,
    p_kind: options.kind || null,
    p_work_mode: options.workMode || null,
    p_tab: options.tab || "open",
    p_saved_only: !!options.savedOnly,
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching festivals:", error);
    throw error;
  }

  const festivals = (data || []) as Festival[];
  const totalCount = festivals.length > 0 ? Number(festivals[0].total_count || 0) : 0;
  const hasMore = offset + festivals.length < totalCount;

  return { festivals, totalCount, hasMore };
}

/**
 * Fetches a single festival by ID.
 */
export async function getFestivalById(
  supabase: SupabaseClient,
  id: string,
  currentUserId?: string | null
): Promise<Festival | null> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  let isSaved = false;
  if (currentUserId) {
    const { data: saveRecord } = await supabase
      .from("festival_saves")
      .select("created_at")
      .eq("festival_id", id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    isSaved = !!saveRecord;
  }

  return {
    ...data,
    is_saved: isSaved,
  } as Festival;
}

/**
 * Toggles bookmark/save state for a festival.
 */
export async function toggleFestivalSave(
  supabase: SupabaseClient,
  festivalId: string,
  userId: string,
  currentlySaved: boolean
): Promise<void> {
  if (currentlySaved) {
    const { error } = await supabase
      .from("festival_saves")
      .delete()
      .eq("festival_id", festivalId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("festival_saves")
      .insert({ festival_id: festivalId, user_id: userId });
    if (error) throw error;
  }
}

/**
 * Admin action: Creates a new festival.
 */
export async function createFestival(
  supabase: SupabaseClient,
  input: FestivalInput
): Promise<Festival> {
  const { data, error } = await supabase
    .from("festivals")
    .insert({
      name: input.name.trim(),
      organiser: input.organiser.trim(),
      kind: input.kind,
      work_mode: input.work_mode,
      city: input.work_mode === "online" ? null : input.city?.trim() || null,
      starts_on: input.starts_on,
      ends_on: input.ends_on,
      submit_by: input.submit_by || null,
      fee_text: input.fee_text?.trim() || null,
      student_friendly: !!input.student_friendly,
      description: input.description?.trim() || null,
      tags: input.tags || [],
      website_url: input.website_url.trim(),
      submit_url: input.submit_url?.trim() || null,
      is_published: input.is_published ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating festival:", error);
    throw error;
  }

  return data as Festival;
}

/**
 * Admin action: Updates an existing festival.
 */
export async function updateFestival(
  supabase: SupabaseClient,
  id: string,
  input: FestivalInput
): Promise<Festival> {
  const { data, error } = await supabase
    .from("festivals")
    .update({
      name: input.name.trim(),
      organiser: input.organiser.trim(),
      kind: input.kind,
      work_mode: input.work_mode,
      city: input.work_mode === "online" ? null : input.city?.trim() || null,
      starts_on: input.starts_on,
      ends_on: input.ends_on,
      submit_by: input.submit_by || null,
      fee_text: input.fee_text?.trim() || null,
      student_friendly: !!input.student_friendly,
      description: input.description?.trim() || null,
      tags: input.tags || [],
      website_url: input.website_url.trim(),
      submit_url: input.submit_url?.trim() || null,
      is_published: input.is_published ?? true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating festival:", error);
    throw error;
  }

  return data as Festival;
}

/**
 * Admin action: Deletes a festival.
 */
export async function deleteFestival(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("festivals")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting festival:", error);
    throw error;
  }
}

/**
 * Admin action: Toggles published state for a festival.
 */
export async function setFestivalPublished(
  supabase: SupabaseClient,
  id: string,
  isPublished: boolean
): Promise<void> {
  const { error } = await supabase
    .from("festivals")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) {
    console.error("Error toggling festival published state:", error);
    throw error;
  }
}

/**
 * Admin action: Lists all festivals (published and unpublished).
 */
export async function getAllAdminFestivals(
  supabase: SupabaseClient
): Promise<Festival[]> {
  const { data, error } = await supabase
    .from("festivals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all admin festivals:", error);
    throw error;
  }

  return (data || []) as Festival[];
}
