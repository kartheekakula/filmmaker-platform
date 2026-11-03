"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  MapPin,
  ExternalLink,
  Globe,
  Tag,
  Clock,
} from "lucide-react";
import { Festival } from "@/lib/types";
import { formatDate, formatDateRange, daysLeft, isExpired } from "@/lib/utils/dates";
import { toggleFestivalSave } from "@/lib/festivals";
import { createClient } from "@/lib/supabase/client";

interface FestivalDetailViewProps {
  festival: Festival;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function FestivalDetailView({
  festival,
  currentUserId,
  isAdmin,
}: FestivalDetailViewProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [isSaved, setIsSaved] = useState<boolean>(!!festival.is_saved);

  const expired = isExpired(festival.submit_by);
  const remainingDays = festival.submit_by ? daysLeft(festival.submit_by) : -1;
  const isClosingSoon = remainingDays >= 0 && remainingDays <= 7;

  const modeLabel =
    festival.work_mode === "online"
      ? "Online"
      : festival.work_mode === "in_person"
      ? "In person"
      : "Hybrid";

  const actionUrl = festival.submit_url || festival.website_url;
  const actionLabel = festival.kind === "festival" ? "Submit" : "Register";

  const handleBookmark = async () => {
    if (!currentUserId) {
      router.push(`/login?next=/festivals/${festival.id}`);
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      await toggleFestivalSave(supabase, festival.id, currentUserId, !nextState);
    } catch (err) {
      console.error("Save error:", err);
      setIsSaved(!nextState);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-5 pb-20">
      {/* Top Navigation */}
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
          {!festival.is_published && isAdmin && (
            <span className="text-[11px] font-mono text-[#878787] bg-[#2E3030] px-2 py-0.5 rounded-full">
              Unpublished
            </span>
          )}

          <button
            type="button"
            onClick={handleBookmark}
            aria-label={isSaved ? "Remove bookmark" : "Bookmark festival"}
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

      {/* Main Container */}
      <article className="w-full bg-[#232525] border border-[#303232] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Organiser + Avatar */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-base text-[#E6E6E6] overflow-hidden select-none ring-2 ring-[#2B2D2D]">
            {(festival.organiser?.[0] || festival.name?.[0] || "F").toUpperCase()}
          </div>
          <div>
            <span className="text-xs text-[#A8A8A8] block">Organised by</span>
            <span className="text-sm font-semibold text-[#E6E6E6]">
              {festival.organiser}
            </span>
          </div>
        </div>

        {/* Festival Name */}
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-[#E6E6E6] leading-snug">
            {festival.name}
          </h1>
        </div>

        {/* Chips Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full capitalize">
            {festival.kind}
          </span>
          <span className="px-3 py-1 text-xs border border-[#303232] text-[#A8A8A8] rounded-full">
            {modeLabel}
          </span>
          {festival.student_friendly && (
            <span className="px-3 py-1 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
              Student
            </span>
          )}
          {isClosingSoon && (
            <span className="px-3 py-1 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
              Closing soon
            </span>
          )}
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 p-4 bg-[#1C1E1E] border border-[#2B2D2D] rounded-xl text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[#878787] block uppercase tracking-wider text-[10px]">
              Dates
            </span>
            <div className="flex items-center space-x-1.5 text-[#E6E6E6]">
              <Calendar size={13} strokeWidth={1.5} className="text-[#878787]" />
              <span>{formatDateRange(festival.starts_on, festival.ends_on)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[#878787] block uppercase tracking-wider text-[10px]">
              Deadline
            </span>
            <div className="flex items-center space-x-1.5 text-[#E6E6E6]">
              <Clock size={13} strokeWidth={1.5} className="text-[#878787]" />
              <span>
                {festival.submit_by ? formatDate(festival.submit_by) : "Open"}
              </span>
              {remainingDays >= 0 && remainingDays <= 14 && (
                <span className="text-[#6C86FF]">
                  ({remainingDays === 0 ? "today" : `${remainingDays}d left`})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[#878787] block uppercase tracking-wider text-[10px]">
              Entry Fee
            </span>
            <span className="text-[#E6E6E6] block">
              {festival.fee_text || "Free"}
            </span>
          </div>

          {festival.work_mode !== "online" && festival.city && (
            <div className="space-y-1">
              <span className="text-[#878787] block uppercase tracking-wider text-[10px]">
                City
              </span>
              <div className="flex items-center space-x-1.5 text-[#E6E6E6]">
                <MapPin size={13} strokeWidth={1.5} className="text-[#878787]" />
                <span>{festival.city}</span>
              </div>
            </div>
          )}
        </div>

        {/* Full Description */}
        {festival.description && (
          <div className="text-sm sm:text-base text-[#E6E6E6] font-sans leading-relaxed whitespace-pre-wrap select-text pt-2">
            {festival.description}
          </div>
        )}

        {/* Tags */}
        {festival.tags && festival.tags.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center space-x-1.5 text-xs text-[#878787] font-mono">
              <Tag size={12} strokeWidth={1.5} />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {festival.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Website Link and Actions */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#303232]">
          <a
            href={festival.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-[#6C86FF] hover:underline font-mono"
          >
            <Globe size={13} strokeWidth={1.5} />
            <span>Visit website</span>
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>

          <div>
            {expired ? (
              <button
                type="button"
                disabled
                className="px-5 py-2 text-xs font-semibold bg-[#2E3030] text-[#878787] rounded-xl cursor-not-allowed"
              >
                Closed
              </button>
            ) : (
              <a
                href={actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <span>{actionLabel}</span>
                <ExternalLink size={13} strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
