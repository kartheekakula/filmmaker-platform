"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Clock,
  Send,
  Loader2,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  EyeOff,
  Eye,
} from "lucide-react";
import {
  CollabRequest,
  CollabApplicationItem,
  WorkMode,
  PayType,
} from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, isExpired } from "@/lib/utils/dates";
import {
  toggleCollabSave,
  applyToCollab,
  withdrawCollabApplication,
  setCollabStatus,
  deleteCollabRequest,
  updateCollabRequest,
  adminSetCollabHidden,
} from "@/lib/collab";
import { FollowButton } from "@/components/profile/FollowButton";
import { createClient } from "@/lib/supabase/client";

interface CollabDetailViewProps {
  initialRequest: CollabRequest;
  initialApplicants?: CollabApplicationItem[];
  currentUserId: string | null;
  initialIsFollowing: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
}

export function CollabDetailView({
  initialRequest,
  initialApplicants = [],
  currentUserId,
  initialIsFollowing,
  isAdmin,
  isRestricted,
}: CollabDetailViewProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [request, setRequest] = useState<CollabRequest>(initialRequest);
  const [applicants, setApplicants] = useState<CollabApplicationItem[]>(initialApplicants);
  const [isSaved, setIsSaved] = useState<boolean>(!!initialRequest.is_saved);
  const [hasApplied, setHasApplied] = useState<boolean>(!!initialRequest.has_applied);

  // Apply flow
  const [showApplyBox, setShowApplyBox] = useState<boolean>(false);
  const [applyNote, setApplyNote] = useState<string>("");
  const [submittingApply, setSubmittingApply] = useState<boolean>(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Owner management
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Owner edit mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState(request.title);
  const [editRoleSlug, setEditRoleSlug] = useState(request.role_slug);
  const [editWorkMode, setEditWorkMode] = useState<WorkMode>(request.work_mode);
  const [editCity, setEditCity] = useState(request.city || "");
  const [editBody, setEditBody] = useState(request.body);
  const [editPayType, setEditPayType] = useState<PayType>(request.pay_type);
  const [editPayNote, setEditPayNote] = useState(request.pay_note || "");
  const [editDurationText, setEditDurationText] = useState(request.duration_text || "");
  const [editApplyBy, setEditApplyBy] = useState(request.apply_by || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Admin hide state
  const [isHidden, setIsHidden] = useState<boolean>(initialRequest.is_hidden);
  const [togglingHide, setTogglingHide] = useState<boolean>(false);

  const isOwner = currentUserId === request.owner_id;
  const expired = isExpired(request.apply_by);
  const isClosed = request.status === "closed" || expired;

  const category = CATEGORIES.find((c) => c.slug === request.role_slug);
  const roleName = category ? category.name : request.role_slug;

  const modeLabel =
    request.work_mode === "remote"
      ? "Remote"
      : request.work_mode === "in_person"
      ? `In person${request.city ? ` • ${request.city}` : ""}`
      : `Hybrid${request.city ? ` • ${request.city}` : ""}`;

  // Bookmark toggle
  const handleBookmark = async () => {
    if (!currentUserId) {
      router.push(`/login?next=/collaborate/${request.id}`);
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      await toggleCollabSave(supabase, request.id, currentUserId, !nextState);
    } catch (err) {
      console.error("Save error:", err);
      setIsSaved(!nextState);
    }
  };

  // Submit application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || submittingApply) return;

    setSubmittingApply(true);
    setApplyError(null);

    try {
      await applyToCollab(supabase, request.id, currentUserId, applyNote);
      setHasApplied(true);
      setShowApplyBox(false);
      setApplyNote("");
      setRequest((prev) => ({
        ...prev,
        applicant_count: prev.applicant_count + 1,
      }));
    } catch (err: any) {
      console.error("Apply error:", err);
      setApplyError(err?.message || "Failed to apply.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Withdraw application
  const handleWithdraw = async () => {
    if (!currentUserId) return;
    try {
      await withdrawCollabApplication(supabase, request.id, currentUserId);
      setHasApplied(false);
      setRequest((prev) => ({
        ...prev,
        applicant_count: Math.max(0, prev.applicant_count - 1),
      }));
    } catch (err) {
      console.error("Withdraw error:", err);
    }
  };

  // Close / Reopen status toggle
  const handleToggleStatus = async () => {
    if (!isOwner || isTogglingStatus) return;
    const nextStatus = request.status === "open" ? "closed" : "open";

    setIsTogglingStatus(true);
    try {
      await setCollabStatus(supabase, request.id, nextStatus);
      setRequest((prev) => ({ ...prev, status: nextStatus }));
    } catch (err) {
      console.error("Status error:", err);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Delete request
  const handleDelete = async () => {
    if (!isOwner || isDeleting) return;

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCollabRequest(supabase, request.id);
      router.push("/collaborate");
    } catch (err) {
      console.error("Delete error:", err);
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Save edit form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || savingEdit) return;

    setSavingEdit(true);
    setEditError(null);

    try {
      const updated = await updateCollabRequest(supabase, request.id, {
        title: editTitle.trim(),
        role_slug: editRoleSlug,
        work_mode: editWorkMode,
        city: editWorkMode === "remote" ? null : editCity.trim(),
        body: editBody.trim(),
        pay_type: editPayType,
        pay_note: editPayType === "paid" ? editPayNote.trim() || null : null,
        duration_text: editDurationText.trim() || null,
        skills: request.skills,
        apply_by: editApplyBy || null,
      });

      setRequest((prev) => ({
        ...prev,
        ...updated,
      }));
      setIsEditing(false);
    } catch (err: any) {
      console.error("Edit error:", err);
      setEditError(err?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Admin hide toggle
  const handleToggleHide = async () => {
    if (!isAdmin || togglingHide) return;
    setTogglingHide(true);
    const nextHidden = !isHidden;

    try {
      await adminSetCollabHidden(supabase, request.id, nextHidden);
      setIsHidden(nextHidden);
    } catch (err) {
      console.error("Hide error:", err);
    } finally {
      setTogglingHide(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-5 pb-20">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleToggleHide}
              disabled={togglingHide}
              className="text-xs font-mono text-[#878787] hover:text-[#E6E6E6] flex items-center space-x-1 cursor-pointer"
            >
              {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{isHidden ? "Unhide" : "Hide"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleBookmark}
            aria-label={isSaved ? "Remove bookmark" : "Bookmark request"}
            className="p-1.5 text-[#A8A8A8] hover:text-[#6C86FF] transition-colors cursor-pointer"
          >
            <Bookmark
              size={18}
              strokeWidth={1.5}
              className={isSaved ? "fill-[#6C86FF] text-[#6C86FF]" : ""}
            />
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <article className="w-full bg-[#232525] border border-[#303232] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
        {/* Poster Block with Follow Button */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#303232]">
          <Link
            href={`/u/${request.owner_username || ""}`}
            className="flex items-center space-x-3 group min-w-0"
          >
            <div className="w-12 h-12 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-base text-[#E6E6E6] overflow-hidden select-none ring-2 ring-[#2B2D2D]">
              {request.owner_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={request.owner_avatar_url}
                  alt={request.owner_display_name || "Creator"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (request.owner_display_name?.[0] || request.owner_username?.[0] || "C").toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
                {request.owner_display_name || request.owner_username}
              </p>
              <p className="text-xs font-mono text-[#878787]">
                @{request.owner_username}
              </p>
            </div>
          </Link>

          {!isOwner && (
            <div>
              <FollowButton
                targetUserId={request.owner_id}
                initialIsFollowing={initialIsFollowing}
                currentUserId={currentUserId}
                username={request.owner_username || ""}
              />
            </div>
          )}
        </div>

        {/* Edit Form OR Content Display */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div>
              <input
                type="text"
                required
                maxLength={80}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={editRoleSlug}
                onChange={(e) => setEditRoleSlug(e.target.value)}
                className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={editWorkMode}
                onChange={(e) => setEditWorkMode(e.target.value as WorkMode)}
                className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
              >
                <option value="remote">Remote</option>
                <option value="in_person">In person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {editWorkMode !== "remote" && (
              <input
                type="text"
                required
                maxLength={40}
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
              />
            )}

            <textarea
              required
              maxLength={600}
              rows={5}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              placeholder="Details"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none resize-none leading-relaxed"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={editPayType}
                onChange={(e) => setEditPayType(e.target.value as PayType)}
                className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>

              {editPayType === "paid" && (
                <input
                  type="text"
                  maxLength={40}
                  value={editPayNote}
                  onChange={(e) => setEditPayNote(e.target.value)}
                  placeholder="Amount"
                  className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                maxLength={24}
                value={editDurationText}
                onChange={(e) => setEditDurationText(e.target.value)}
                placeholder="Duration"
                className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
              />

              <input
                type="date"
                value={editApplyBy}
                onChange={(e) => setEditApplyBy(e.target.value)}
                className="px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-xs text-[#E6E6E6] focus:outline-none"
              />
            </div>

            {editError && (
              <p className="text-xs text-red-400 font-mono">{editError}</p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs border border-[#303232] text-[#A8A8A8] rounded-xl hover:text-[#E6E6E6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] text-[#E6E6E6] rounded-xl disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Title */}
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl text-[#E6E6E6] leading-snug">
                {request.title}
              </h1>
            </div>

            {/* Chips Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full">
                {roleName}
              </span>
              <span className="px-3 py-1 text-xs border border-[#303232] text-[#A8A8A8] rounded-full">
                {modeLabel}
              </span>
              {request.pay_type === "paid" ? (
                <span className="px-3 py-1 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
                  Paid
                </span>
              ) : (
                <span className="px-3 py-1 text-xs bg-[#2E3030] text-[#A8A8A8] rounded-full">
                  Unpaid
                </span>
              )}
            </div>

            {/* Pay Note & Duration Row */}
            {(request.pay_note || request.duration_text) && (
              <div className="flex items-center justify-between text-xs text-[#A8A8A8] font-mono pt-1">
                <div>{request.pay_note || null}</div>
                {request.duration_text && (
                  <div className="flex items-center space-x-1.5">
                    <Clock size={13} strokeWidth={1.5} className="text-[#878787]" />
                    <span>{request.duration_text}</span>
                  </div>
                )}
              </div>
            )}

            {/* Whole Description */}
            <div className="text-sm sm:text-base text-[#E6E6E6] font-sans leading-relaxed whitespace-pre-wrap select-text pt-2">
              {request.body}
            </div>

            {/* Skills */}
            {request.skills && request.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {request.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Dates row */}
            <div className="flex items-center justify-between text-xs font-mono text-[#878787] pt-3 border-t border-[#303232]">
              <span>Posted {formatDate(request.created_at)}</span>
              {request.apply_by && <span>Apply by {formatDate(request.apply_by)}</span>}
            </div>

            {/* Owner Actions OR Viewer Apply Action */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#303232]">
              {isOwner ? (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <Edit2 size={13} strokeWidth={1.5} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isTogglingStatus}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] rounded-xl transition-colors cursor-pointer"
                  >
                    {request.status === "open" ? "Close" : "Reopen"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                      confirmDelete
                        ? "bg-red-950/60 border-red-500/60 text-red-300"
                        : "bg-[#1C1E1E] hover:bg-[#2E3030] border-[#303232] text-red-400"
                    }`}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                    <span>{confirmDelete ? "Sure?" : "Delete"}</span>
                  </button>
                </div>
              ) : hasApplied ? (
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 text-xs font-semibold bg-[#2E3030] text-[#878787] rounded-xl cursor-not-allowed"
                  >
                    Applied
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    className="text-xs text-[#878787] hover:text-red-400 hover:underline font-mono cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              ) : isClosed ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 text-xs font-semibold bg-[#2E3030] text-[#878787] rounded-xl cursor-not-allowed"
                >
                  Closed
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowApplyBox((prev) => !prev)}
                  className="px-5 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] rounded-xl transition-colors cursor-pointer"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Viewer Inline Apply Box */}
            {showApplyBox && !isOwner && !hasApplied && !isClosed && (
              <div className="pt-4 border-t border-[#303232] space-y-3">
                {isRestricted ? (
                  <p className="text-xs text-[#878787] font-mono py-2 text-center">
                    Account restricted
                  </p>
                ) : (
                  <form onSubmit={handleSubmitApplication} className="space-y-3">
                    <div className="space-y-1">
                      <textarea
                        value={applyNote}
                        onChange={(e) => setApplyNote(e.target.value)}
                        maxLength={300}
                        rows={4}
                        placeholder="Add a note"
                        className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] resize-none transition-colors"
                      />
                      <div className="flex justify-end text-[10px] font-mono text-[#878787]">
                        {applyNote.length}/300
                      </div>
                    </div>

                    {applyError && (
                      <p className="text-xs text-red-400 font-mono">{applyError}</p>
                    )}

                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowApplyBox(false)}
                        className="px-3.5 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] border border-[#303232] rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingApply}
                        className="px-4 py-1.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submittingApply ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} strokeWidth={1.5} />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </article>

      {/* Owner Applicants List */}
      {isOwner && (
        <section className="space-y-4 pt-4">
          <h2 className="font-heading text-lg text-[#E6E6E6] tracking-tight">
            Applicants ({applicants.length})
          </h2>

          {applicants.length === 0 ? (
            <div className="p-6 bg-[#232525] border border-dashed border-[#303232] rounded-2xl text-center">
              <p className="text-xs text-[#878787]">No applicants yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.map((app) => (
                <div
                  key={app.applicant_id}
                  className="bg-[#232525] border border-[#303232] rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/u/${app.applicant.username}`}
                      className="flex items-center space-x-3 group min-w-0"
                    >
                      <div className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-[#E6E6E6] overflow-hidden select-none">
                        {app.applicant.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={app.applicant.avatar_url}
                            alt={app.applicant.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (app.applicant.display_name?.[0] || app.applicant.username?.[0] || "U").toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
                          {app.applicant.display_name || app.applicant.username}
                        </p>
                        {app.applicant.headline && (
                          <p className="text-xs text-[#A8A8A8] truncate">
                            {app.applicant.headline}
                          </p>
                        )}
                      </div>
                    </Link>

                    <span className="text-[11px] font-mono text-[#878787] shrink-0">
                      {formatDate(app.created_at)}
                    </span>
                  </div>

                  {app.note && (
                    <p className="text-xs text-[#E6E6E6] bg-[#1C1E1E] p-3 rounded-xl border border-[#2B2D2D] leading-relaxed whitespace-pre-wrap">
                      {app.note}
                    </p>
                  )}

                  {/* Profile Links */}
                  {app.applicant.links && Object.keys(app.applicant.links).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(app.applicant.links).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-[#6C86FF] hover:underline font-mono"
                        >
                          <span className="capitalize">{platform}</span>
                          <ExternalLink size={11} strokeWidth={1.5} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

