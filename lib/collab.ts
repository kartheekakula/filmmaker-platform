import { SupabaseClient } from "@supabase/supabase-js";
import {
  CollabRequest,
  CollabRequestInput,
  CollabApplicationItem,
  MyCollabItem,
  WorkMode,
} from "./types";

export interface CollabListOptions {
  search?: string | null;
  roleSlug?: string | null;
  workMode?: WorkMode | null;
  savedOnly?: boolean;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}

/**
 * Lists open and unexpired collaboration requests via list_collabs RPC.
 */
export async function getCollabRequests(
  supabase: SupabaseClient,
  options: CollabListOptions = {}
): Promise<{ requests: CollabRequest[]; nextCursor: { created_at: string; id: string } | null; hasMore: boolean }> {
  const limit = options.limit ?? 10;

  const { data, error } = await supabase.rpc("list_collabs", {
    p_search: options.search?.trim() || null,
    p_role_slug: options.roleSlug || null,
    p_work_mode: options.workMode || null,
    p_saved_only: !!options.savedOnly,
    p_cursor_created_at: options.cursorCreatedAt || null,
    p_cursor_id: options.cursorId || null,
    p_limit: limit + 1,
  });

  if (error) {
    console.error("Error fetching collab requests:", error);
    throw error;
  }

  const items = (data || []) as CollabRequest[];
  const hasMore = items.length > limit;
  const requests = hasMore ? items.slice(0, limit) : items;

  let nextCursor: { created_at: string; id: string } | null = null;
  if (hasMore && requests.length > 0) {
    const lastItem = requests[requests.length - 1];
    nextCursor = {
      created_at: lastItem.created_at,
      id: lastItem.id,
    };
  }

  return { requests, nextCursor, hasMore };
}

/**
 * Fetches a single collaboration request by ID, including owner profile and caller flags.
 */
export async function getCollabRequestById(
  supabase: SupabaseClient,
  id: string,
  currentUserId?: string | null
): Promise<CollabRequest | null> {
  const { data, error } = await supabase
    .from("collab_requests")
    .select(`
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url,
        headline
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  let isSaved = false;
  let hasApplied = false;

  if (currentUserId) {
    const [saveRes, appRes] = await Promise.all([
      supabase
        .from("collab_saves")
        .select("created_at")
        .eq("collab_id", id)
        .eq("user_id", currentUserId)
        .maybeSingle(),
      supabase
        .from("collab_applications")
        .select("created_at")
        .eq("collab_id", id)
        .eq("applicant_id", currentUserId)
        .maybeSingle(),
    ]);

    isSaved = !!saveRes.data;
    hasApplied = !!appRes.data;
  }

  const profile = (data as any).profiles;

  return {
    ...data,
    owner_username: profile?.username || "creator",
    owner_display_name: profile?.display_name || "Creator",
    owner_avatar_url: profile?.avatar_url || null,
    is_saved: isSaved,
    has_applied: hasApplied,
  } as CollabRequest;
}

/**
 * Creates a new collaboration request.
 */
export async function createCollabRequest(
  supabase: SupabaseClient,
  ownerId: string,
  input: CollabRequestInput
): Promise<CollabRequest> {
  const { data, error } = await supabase
    .from("collab_requests")
    .insert({
      owner_id: ownerId,
      title: input.title.trim(),
      role_slug: input.role_slug,
      body: input.body.trim(),
      work_mode: input.work_mode,
      city: input.work_mode === "remote" ? null : input.city?.trim() || null,
      pay_type: input.pay_type || "unpaid",
      pay_note: input.pay_type === "paid" ? input.pay_note?.trim() || null : null,
      duration_text: input.duration_text?.trim() || null,
      skills: input.skills || [],
      apply_by: input.apply_by || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating collab request:", error);
    throw error;
  }

  return data as CollabRequest;
}

/**
 * Updates an existing collaboration request.
 */
export async function updateCollabRequest(
  supabase: SupabaseClient,
  id: string,
  input: CollabRequestInput
): Promise<CollabRequest> {
  const { data, error } = await supabase
    .from("collab_requests")
    .update({
      title: input.title.trim(),
      role_slug: input.role_slug,
      body: input.body.trim(),
      work_mode: input.work_mode,
      city: input.work_mode === "remote" ? null : input.city?.trim() || null,
      pay_type: input.pay_type || "unpaid",
      pay_note: input.pay_type === "paid" ? input.pay_note?.trim() || null : null,
      duration_text: input.duration_text?.trim() || null,
      skills: input.skills || [],
      apply_by: input.apply_by || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating collab request:", error);
    throw error;
  }

  return data as CollabRequest;
}

/**
 * Sets the status of a collaboration request ('open' | 'closed').
 */
export async function setCollabStatus(
  supabase: SupabaseClient,
  id: string,
  status: "open" | "closed"
): Promise<void> {
  const { error } = await supabase
    .from("collab_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Error changing collab status:", error);
    throw error;
  }
}

/**
 * Deletes a collaboration request.
 */
export async function deleteCollabRequest(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("collab_requests")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting collab request:", error);
    throw error;
  }
}

/**
 * Toggles bookmark/save state for a collaboration request.
 */
export async function toggleCollabSave(
  supabase: SupabaseClient,
  collabId: string,
  userId: string,
  currentlySaved: boolean
): Promise<void> {
  if (currentlySaved) {
    const { error } = await supabase
      .from("collab_saves")
      .delete()
      .eq("collab_id", collabId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("collab_saves")
      .insert({ collab_id: collabId, user_id: userId });
    if (error) throw error;
  }
}

/**
 * Submits an application to a collaboration request.
 */
export async function applyToCollab(
  supabase: SupabaseClient,
  collabId: string,
  applicantId: string,
  note?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("collab_applications")
    .insert({
      collab_id: collabId,
      applicant_id: applicantId,
      note: note?.trim() || null,
    });

  if (error) {
    // If already applied (unique primary key constraint), handle quietly
    if (error.code === "23505") {
      return;
    }
    console.error("Error applying to collab:", error);
    throw error;
  }
}

/**
 * Withdraws/deletes a collaboration application.
 */
export async function withdrawCollabApplication(
  supabase: SupabaseClient,
  collabId: string,
  applicantId: string
): Promise<void> {
  const { error } = await supabase
    .from("collab_applications")
    .delete()
    .eq("collab_id", collabId)
    .eq("applicant_id", applicantId);

  if (error) {
    console.error("Error withdrawing application:", error);
    throw error;
  }
}

/**
 * Retrieves all applicants for a collaboration request (for the owner).
 */
export async function getCollabApplicants(
  supabase: SupabaseClient,
  collabId: string
): Promise<CollabApplicationItem[]> {
  const { data, error } = await supabase
    .from("collab_applications")
    .select(`
      collab_id,
      applicant_id,
      note,
      created_at,
      profiles:applicant_id (
        id,
        username,
        display_name,
        headline,
        avatar_url,
        links
      )
    `)
    .eq("collab_id", collabId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading collab applicants:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    collab_id: row.collab_id,
    applicant_id: row.applicant_id,
    note: row.note,
    created_at: row.created_at,
    applicant: {
      id: row.profiles?.id || row.applicant_id,
      username: row.profiles?.username || "user",
      display_name: row.profiles?.display_name || "Applicant",
      headline: row.profiles?.headline || null,
      avatar_url: row.profiles?.avatar_url || null,
      links: row.profiles?.links || null,
    },
  }));
}

/**
 * Retrieves requests posted by the current user.
 */
export async function getMyPostedCollabs(
  supabase: SupabaseClient,
  userId: string
): Promise<MyCollabItem[]> {
  const { data, error } = await supabase
    .from("collab_requests")
    .select(`
      *,
      profiles:owner_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading my posted collabs:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    ...row,
    owner_username: row.profiles?.username,
    owner_display_name: row.profiles?.display_name,
    owner_avatar_url: row.profiles?.avatar_url,
  }));
}

/**
 * Retrieves requests applied to by the current user.
 */
export async function getMyAppliedCollabs(
  supabase: SupabaseClient,
  userId: string
): Promise<MyCollabItem[]> {
  const { data, error } = await supabase
    .from("collab_applications")
    .select(`
      note,
      created_at,
      collab_requests:collab_id (
        *,
        profiles:owner_id (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading my applied collabs:", error);
    throw error;
  }

  return (data || [])
    .filter((row: any) => row.collab_requests)
    .map((row: any) => {
      const req = row.collab_requests;
      const profile = req.profiles;
      return {
        ...req,
        owner_username: profile?.username,
        owner_display_name: profile?.display_name,
        owner_avatar_url: profile?.avatar_url,
        has_applied: true,
        application_note: row.note,
        application_created_at: row.created_at,
      };
    });
}

/**
 * Admin action: Hide or unhide a collaboration request.
 */
export async function adminSetCollabHidden(
  supabase: SupabaseClient,
  id: string,
  isHidden: boolean
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_collab_hidden", {
    p_id: id,
    p_hidden: isHidden,
  });

  if (error) {
    console.error("Error setting collab hidden state:", error);
    throw error;
  }
}
