"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Clock } from "lucide-react";
import { MyCollabItem } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils/dates";

interface CollabMineViewProps {
  initialPosted: MyCollabItem[];
  initialApplied: MyCollabItem[];
}

export function CollabMineView({
  initialPosted,
  initialApplied,
}: CollabMineViewProps) {
  const [tab, setTab] = useState<"posted" | "applied">("posted");

  const getRoleName = (slug: string) => {
    const found = CATEGORIES.find((c) => c.slug === slug);
    return found ? found.name : slug;
  };

  return (
    <div className="max-w-[680px] mx-auto space-y-5 pb-20">
      {/* Top Nav */}
      <div>
        <Link
          href="/collaborate"
          className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          <span>Collaborate</span>
        </Link>
      </div>

      {/* Tabs: Plain text tabs */}
      <div className="flex border-b border-[#303232] space-x-6">
        <button
          type="button"
          onClick={() => setTab("posted")}
          className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
            tab === "posted"
              ? "border-[#E6E6E6] text-[#E6E6E6]"
              : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
          }`}
        >
          Posted ({initialPosted.length})
        </button>

        <button
          type="button"
          onClick={() => setTab("applied")}
          className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
            tab === "applied"
              ? "border-[#E6E6E6] text-[#E6E6E6]"
              : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
          }`}
        >
          Applied ({initialApplied.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === "posted" ? (
        initialPosted.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#303232] rounded-2xl p-6">
            <p className="text-xs text-[#878787]">No posted requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialPosted.map((req) => (
              <div
                key={req.id}
                className="bg-[#232525] border border-[#303232] rounded-2xl p-4 sm:p-5 space-y-2.5 hover:border-[#6C86FF]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/collaborate/${req.id}`}
                    className="font-heading text-base sm:text-lg text-[#E6E6E6] hover:text-[#6C86FF] transition-colors line-clamp-1"
                  >
                    {req.title}
                  </Link>

                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono uppercase rounded-full shrink-0 ${
                      req.status === "open"
                        ? "bg-[#0B1A4A] text-[#6C86FF]"
                        : "bg-[#2E3030] text-[#878787]"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="px-2.5 py-0.5 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full">
                    {getRoleName(req.role_slug)}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs border border-[#303232] text-[#A8A8A8] rounded-full">
                    {req.work_mode === "remote" ? "Remote" : req.work_mode === "in_person" ? "In person" : "Hybrid"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#878787] pt-2 border-t border-[#303232]">
                  <div className="flex items-center space-x-1">
                    <Users size={13} strokeWidth={1.5} />
                    <span>{req.applicant_count} applicant{req.applicant_count === 1 ? "" : "s"}</span>
                  </div>

                  <span>Posted {formatDate(req.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        initialApplied.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#303232] rounded-2xl p-6">
            <p className="text-xs text-[#878787]">No applied requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialApplied.map((req) => (
              <div
                key={req.id}
                className="bg-[#232525] border border-[#303232] rounded-2xl p-4 sm:p-5 space-y-2.5 hover:border-[#6C86FF]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/collaborate/${req.id}`}
                    className="font-heading text-base sm:text-lg text-[#E6E6E6] hover:text-[#6C86FF] transition-colors line-clamp-1"
                  >
                    {req.title}
                  </Link>

                  <span
                    className={`px-2 py-0.5 text-[11px] font-mono uppercase rounded-full shrink-0 ${
                      req.status === "open"
                        ? "bg-[#0B1A4A] text-[#6C86FF]"
                        : "bg-[#2E3030] text-[#878787]"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="px-2.5 py-0.5 text-xs bg-[#2E3030] text-[#E6E6E6] rounded-full">
                    {getRoleName(req.role_slug)}
                  </span>
                  <span className="text-xs text-[#878787]">
                    by {req.owner_display_name || req.owner_username}
                  </span>
                </div>

                {req.application_note && (
                  <p className="text-xs text-[#A8A8A8] bg-[#1C1E1E] p-2.5 rounded-xl border border-[#2B2D2D] line-clamp-2">
                    {req.application_note}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs font-mono text-[#878787] pt-2 border-t border-[#303232]">
                  <span>Applied {formatDate(req.application_created_at)}</span>
                  <Link
                    href={`/collaborate/${req.id}`}
                    className="text-[#6C86FF] hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

