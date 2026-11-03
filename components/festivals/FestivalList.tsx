"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Bookmark, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Festival, FestivalKind, FestivalWorkMode, FestivalTab } from "@/lib/types";
import { getFestivals } from "@/lib/festivals";
import { createClient } from "@/lib/supabase/client";
import { FestivalCard } from "./FestivalCard";
import { useDebounce } from "@/lib/utils/search";

interface FestivalListProps {
  currentUserId?: string | null;
}

const PAGE_SIZE = 20;

export function FestivalList({ currentUserId }: FestivalListProps) {
  const [supabase] = useState(() => createClient());

  // Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [kind, setKind] = useState<string>("");
  const [workMode, setWorkMode] = useState<string>("");
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FestivalTab>("open");

  // Pagination & Data
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFestivals = useCallback(
    async (newOffset = 0) => {
      setLoading(true);
      setError(null);

      try {
        const searchTerm =
          debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : null;

        const res = await getFestivals(supabase, {
          search: searchTerm,
          kind: (kind as FestivalKind) || null,
          workMode: (workMode as FestivalWorkMode) || null,
          tab: activeTab,
          savedOnly,
          offset: newOffset,
          limit: PAGE_SIZE,
        });

        setFestivals(res.festivals);
        setTotalCount(res.totalCount);
        setOffset(newOffset);
      } catch (err: any) {
        console.error("Festival fetch error:", err);
        setError("Could not load festivals.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, debouncedSearch, kind, workMode, activeTab, savedOnly]
  );

  // Trigger load when filters or tabs change
  useEffect(() => {
    loadFestivals(0);
  }, [loadFestivals]);

  const handleNextPage = () => {
    if (offset + PAGE_SIZE < totalCount) {
      loadFestivals(offset + PAGE_SIZE);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevPage = () => {
    if (offset >= PAGE_SIZE) {
      loadFestivals(offset - PAGE_SIZE);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#878787] pointer-events-none"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search"
          className="w-full pl-10 pr-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
        />
      </div>

      {/* Filter Row: Type Dropdown, Mode Dropdown, Saved Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          {/* Type Dropdown */}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#1C1E1E] border border-[#303232] rounded-xl text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
          >
            <option value="">All types</option>
            <option value="festival">Festival</option>
            <option value="screening">Screening</option>
            <option value="workshop">Workshop</option>
          </select>

          {/* Mode Dropdown */}
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#1C1E1E] border border-[#303232] rounded-xl text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
          >
            <option value="">Any mode</option>
            <option value="online">Online</option>
            <option value="in_person">In person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Saved Toggle */}
        <button
          type="button"
          onClick={() => setSavedOnly((prev) => !prev)}
          aria-label="Filter saved festivals"
          title={savedOnly ? "Showing saved festivals" : "Show saved festivals"}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            savedOnly
              ? "bg-[#0B1A4A] border-[#6C86FF] text-[#6C86FF]"
              : "bg-[#1C1E1E] border-[#303232] text-[#878787] hover:text-[#E6E6E6]"
          }`}
        >
          <Bookmark
            size={16}
            strokeWidth={1.5}
            className={savedOnly ? "fill-[#6C86FF]" : ""}
          />
        </button>
      </div>

      {/* Plain Text Tabs: Open (default), Upcoming, Past */}
      <div className="flex border-b border-[#303232] space-x-6 pt-2">
        {(["open", "upcoming", "past"] as FestivalTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === t
                ? "border-[#E6E6E6] text-[#E6E6E6]"
                : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
            }`}
          >
            {t === "open" ? "Open" : t === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-[#1C1E1E] border border-[#303232] rounded-2xl flex items-center justify-between text-xs font-mono">
          <span className="text-red-400">{error}</span>
          <button
            type="button"
            onClick={() => loadFestivals(0)}
            className="text-[#6C86FF] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4 pt-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-[#232525] border border-[#303232] rounded-2xl space-y-3 animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#2E3030] rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-24 h-3 bg-[#2E3030] rounded" />
                  <div className="w-48 h-4 bg-[#2E3030] rounded" />
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="w-16 h-5 bg-[#2E3030] rounded-full" />
                <div className="w-20 h-5 bg-[#2E3030] rounded-full" />
              </div>
              <div className="w-full h-8 bg-[#2E3030] rounded" />
            </div>
          ))}
        </div>
      ) : festivals.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center border border-dashed border-[#303232] rounded-2xl p-6 space-y-2">
          {activeTab === "open" && !savedOnly && !searchInput && !kind && !workMode ? (
            <p className="text-sm text-[#878787]">
              Nothing open. Check{" "}
              <button
                type="button"
                onClick={() => setActiveTab("upcoming")}
                className="text-[#6C86FF] hover:underline cursor-pointer"
              >
                Upcoming
              </button>
              .
            </p>
          ) : (
            <p className="text-sm text-[#878787]">
              {savedOnly ? "No saved entries." : "No festivals found."}
            </p>
          )}
        </div>
      ) : (
        /* Single column of cards */
        <div className="space-y-4 pt-1">
          {festivals.map((fest) => (
            <FestivalCard
              key={fest.id}
              festival={fest}
              currentUserId={currentUserId}
            />
          ))}

          {/* Offset Pagination Controls (20 per page) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#303232] text-xs font-mono text-[#878787]">
              <span>
                Page {currentPage} of {totalPages} ({totalCount} total)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={offset === 0}
                  className="p-1.5 border border-[#303232] rounded-xl hover:bg-[#2E3030] text-[#E6E6E6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={offset + PAGE_SIZE >= totalCount}
                  className="p-1.5 border border-[#303232] rounded-xl hover:bg-[#2E3030] text-[#E6E6E6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
