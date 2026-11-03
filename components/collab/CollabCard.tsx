"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Clock, Send, Loader2 } from "lucide-react";
import { CollabRequest } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, isExpired } from "@/lib/utils/dates";
import { toggleCollabSave, applyToCollab } from "@/lib/collab";
import { createClient } from "@/lib/supabase/client";

interface CollabCardProps {
  request: CollabRequest;
  currentUserId?: string | null;
  isRestricted?: boolean;
  onApplySuccess?: (collabId: string) => void;
}

export function CollabCard({
  request,
  currentUserId,
  isRestricted = false,
  onApplySuccess,
}: CollabCardProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [isSaved, setIsSaved] = useState<boolean>(!!request.is_saved);
  const [hasApplied, setHasApplied] = useState<boolean>(!!request.has_applied);
  const [showApplyBox, setShowApplyBox] = useState<boolean>(false);
  const [applyNote, setApplyNote] = useState<string>("");
  const [submittingApply, setSubmittingApply] = useState<boolean>(false);
  const [applyError, setApplyError] = useState<string | null>(null);

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

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push(`/login?next=/collaborate`);
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      await toggleCollabSave(supabase, request.id, currentUserId, !nextState);
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
      setIsSaved(!nextState);
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push(`/login?next=/collaborate`);
      return;
    }

    if (isOwner) {
      router.push(`/collaborate/${request.id}`);
      return;
    }

    if (hasApplied || isClosed) return;

    setShowApplyBox((prev) => !prev);
  };

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
      if (onApplySuccess) {
        onApplySuccess(request.id);
      }
    } catch (err: any) {
      console.error("Application error:", err);
      setApplyError(err?.message || "Failed to submit application.");
    } finally {
      setSubmittingApply(false);
    }
  };

  return (
    <article className="w-full bg-[#232525] border border-[#303232] rounded-2xl p-5 space-y-4 shadow-lg hover:border-[#6C86FF]/40 transition-colors">
      {/* 1. Header: Avatar + Name + Title + Bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {/* Avatar with initial fallback */}
          <Link
            href={`/u/${request.owner_username || ""}`}
            className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-[#E6E6E6] overflow-hidden select-none ring-2 ring-[#2B2D2D]"
          >
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
          </Link>

          <div className="min-w-0 flex-1 space-y-0.5">
            <Link
              href={`/u/${request.owner_username || ""}`}
              className="text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors truncate block"
            >
              {request.owner_display_name || request.owner_username || "Creator"}
            </Link>
            <Link href={`/collaborate/${request.id}`} className="block group">
              <h3 className="font-heading text-lg sm:text-xl text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors leading-snug">
                {request.title}
              </h3>
            </Link>
          </div>
        </div>

        {/* Bookmark Icon */}
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={isSaved ? "Remove bookmark" : "Bookmark request"}
          className="shrink-0 p-1.5 text-[#A8A8A8] hover:text-[#6C86FF] transition-colors cursor-pointer"
        >
          <Bookmark
            size={18}
            strokeWidth={1.5}
            className={isSaved ? "fill-[#6C86FF] text-[#6C86FF]" : ""}
          />
        </button>
      </div>

      {/* 2. Chips row: Role (neutral), Mode (outline), Pay (blue wash or neutral) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Role chip (neutral #2E3030) */}
        <span className="px-2.5 py-0.5 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full">
          {roleName}
        </span>

        {/* Mode chip (outline #303232) */}
        <span className="px-2.5 py-0.5 text-xs border border-[#303232] text-[#A8A8A8] rounded-full">
          {modeLabel}
        </span>

        {/* Pay chip: Paid (#0B1A4A text #6C86FF) / Unpaid (#2E3030 text #A8A8A8) */}
        {request.pay_type === "paid" ? (
          <span className="px-2.5 py-0.5 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
            Paid
          </span>
        ) : (
          <span className="px-2.5 py-0.5 text-xs bg-[#2E3030] text-[#A8A8A8] rounded-full">
            Unpaid
          </span>
        )}
      </div>

      {/* 3. Row: Pay note on left, Clock + duration on right */}
      {(request.pay_note || request.duration_text) && (
        <div className="flex items-center justify-between text-xs text-[#A8A8A8] font-mono pt-1">
          <div>
            {request.pay_type === "paid" && request.pay_note ? (
              <span>{request.pay_note}</span>
            ) : null}
          </div>
          {request.duration_text && (
            <div className="flex items-center space-x-1.5">
              <Clock size={13} strokeWidth={1.5} className="text-[#878787]" />
              <span>{request.duration_text}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Description (2 lines, ellipsis) */}
      <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-2">
        {request.body}
      </p>

      {/* 5. Skill chips */}
      {request.skills && request.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {request.skills.map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* 6. Dates row: Posted on left, Apply by on right */}
      <div className="flex items-center justify-between text-xs font-mono text-[#878787] pt-2 border-t border-[#303232]">
        <span>Posted {formatDate(request.created_at)}</span>
        {request.apply_by && <span>Apply by {formatDate(request.apply_by)}</span>}
      </div>

      {/* 7. Bottom Action Buttons: Details (outline) and Apply (filled blue) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href={`/collaborate/${request.id}`}
          className="px-4 py-2 text-xs font-semibold border border-[#303232] text-[#E6E6E6] hover:bg-[#2E3030] rounded-xl transition-colors"
        >
          Details
        </Link>

        {isOwner ? (
          <Link
            href={`/collaborate/${request.id}`}
            className="px-4 py-2 text-xs font-semibold bg-[#2E3030] hover:bg-[#383A3A] text-[#E6E6E6] rounded-xl transition-colors"
          >
            Manage
          </Link>
        ) : hasApplied ? (
          <button
            type="button"
            disabled
            className="px-4 py-2 text-xs font-semibold bg-[#2E3030] text-[#878787] rounded-xl cursor-not-allowed"
          >
            Applied
          </button>
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
            onClick={handleApplyClick}
            className="px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] rounded-xl transition-colors cursor-pointer"
          >
            Apply
          </button>
        )}
      </div>

      {/* 8. Inline Application Box */}
      {showApplyBox && !hasApplied && !isClosed && (
        <div className="pt-3 border-t border-[#303232] space-y-3">
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
                  rows={3}
                  placeholder="Add a note"
                  className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] rounded-xl text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] resize-none transition-colors"
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
                  disabled={submittingApply}
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
    </article>
  );
}

