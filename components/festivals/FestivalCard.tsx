"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Calendar, MapPin, ExternalLink } from "lucide-react";
import { Festival } from "@/lib/types";
import { formatDate, formatDateRange, daysLeft, isExpired } from "@/lib/utils/dates";
import { toggleFestivalSave } from "@/lib/festivals";
import { createClient } from "@/lib/supabase/client";

interface FestivalCardProps {
  festival: Festival;
  currentUserId?: string | null;
}

export function FestivalCard({ festival, currentUserId }: FestivalCardProps) {
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

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push(`/login?next=/festivals`);
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
    <article className="w-full bg-[#232525] border border-[#303232] rounded-2xl p-5 space-y-4 shadow-lg hover:border-[#6C86FF]/40 transition-colors">
      {/* 1. Header: Initial Avatar + Organiser + Name + Bookmark */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {/* Avatar with initial fallback */}
          <div className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-[#E6E6E6] overflow-hidden select-none ring-2 ring-[#2B2D2D]">
            {(festival.organiser?.[0] || festival.name?.[0] || "F").toUpperCase()}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-xs text-[#A8A8A8] truncate block">
              {festival.organiser}
            </span>
            <Link href={`/festivals/${festival.id}`} className="block group">
              <h3 className="font-heading text-lg sm:text-xl text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors leading-snug">
                {festival.name}
              </h3>
            </Link>
          </div>
        </div>

        {/* Bookmark Icon */}
        <button
          type="button"
          onClick={handleBookmark}
          aria-label={isSaved ? "Remove bookmark" : "Bookmark festival"}
          className="shrink-0 p-1.5 text-[#A8A8A8] hover:text-[#6C86FF] transition-colors cursor-pointer"
        >
          <Bookmark
            size={18}
            strokeWidth={1.5}
            className={isSaved ? "fill-[#6C86FF] text-[#6C86FF]" : ""}
          />
        </button>
      </div>

      {/* 2. Chips: Type (neutral), Mode (outline), Student (blue wash), Closing soon (blue wash) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="px-2.5 py-0.5 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full capitalize">
          {festival.kind}
        </span>

        <span className="px-2.5 py-0.5 text-xs border border-[#303232] text-[#A8A8A8] rounded-full">
          {modeLabel}
        </span>

        {festival.student_friendly && (
          <span className="px-2.5 py-0.5 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
            Student
          </span>
        )}

        {isClosingSoon && (
          <span className="px-2.5 py-0.5 text-xs bg-[#0B1A4A] text-[#6C86FF] font-medium rounded-full">
            Closing soon
          </span>
        )}
      </div>

      {/* 3. Row: Fee on left, Calendar + Date Range on right */}
      <div className="flex items-center justify-between text-xs font-mono text-[#A8A8A8] pt-1">
        <div>{festival.fee_text || "Free"}</div>
        <div className="flex items-center space-x-1.5">
          <Calendar size={13} strokeWidth={1.5} className="text-[#878787]" />
          <span>{formatDateRange(festival.starts_on, festival.ends_on)}</span>
        </div>
      </div>

      {/* 4. Map-pin and city (when not online) */}
      {festival.work_mode !== "online" && festival.city && (
        <div className="flex items-center space-x-1.5 text-xs text-[#878787]">
          <MapPin size={13} strokeWidth={1.5} />
          <span>{festival.city}</span>
        </div>
      )}

      {/* 5. Description (two lines, ellipsis) */}
      {festival.description && (
        <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-2">
          {festival.description}
        </p>
      )}

      {/* 6. Tag chips */}
      {festival.tags && festival.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {festival.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 7. Dates row: Starts on left, Submit by on right (+ days left) */}
      <div className="flex items-center justify-between text-xs font-mono text-[#878787] pt-2 border-t border-[#303232]">
        <span>Starts {formatDate(festival.starts_on)}</span>
        {festival.submit_by && (
          <div className="flex items-center space-x-1.5">
            <span>Submit by {formatDate(festival.submit_by)}</span>
            {remainingDays >= 0 && remainingDays <= 14 && (
              <span className="text-[#6C86FF]">
                ({remainingDays === 0 ? "today" : `${remainingDays}d left`})
              </span>
            )}
          </div>
        )}
      </div>

      {/* 8. Action Buttons: Details (outline) and Submit/Register (filled blue) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Link
          href={`/festivals/${festival.id}`}
          className="px-4 py-2 text-xs font-semibold border border-[#303232] text-[#E6E6E6] hover:bg-[#2E3030] rounded-xl transition-colors"
        >
          Details
        </Link>

        {expired ? (
          <button
            type="button"
            disabled
            className="px-4 py-2 text-xs font-semibold bg-[#2E3030] text-[#878787] rounded-xl cursor-not-allowed"
          >
            Closed
          </button>
        ) : (
          <a
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <span>{actionLabel}</span>
            <ExternalLink size={13} strokeWidth={1.5} />
          </a>
        )}
      </div>
    </article>
  );
}
