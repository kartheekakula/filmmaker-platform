"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Plus, Bookmark, Search, RefreshCw } from "lucide-react";
import { CollabRequest, WorkMode } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";
import { getCollabRequests } from "@/lib/collab";
import { createClient } from "@/lib/supabase/client";
import { CollabCard } from "./CollabCard";
import { useDebounce } from "@/lib/utils/search";

interface CollabListProps {
  currentUserId?: string | null;
  isRestricted?: boolean;
}

export function CollabList({ currentUserId, isRestricted = false }: CollabListProps) {
  const [supabase] = useState(() => createClient());

  // Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 250);
  const [roleSlug, setRoleSlug] = useState<string>("");
  const [workMode, setWorkMode] = useState<string>("");
  const [savedOnly, setSavedOnly] = useState<boolean>(false);

  // Data & Pagination
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial or refreshed list
  const loadRequests = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const searchTerm =
          debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : null;

        const res = await getCollabRequests(supabase, {
          search: searchTerm,
          roleSlug: roleSlug || null,
          workMode: (workMode as WorkMode) || null,
          savedOnly,
          limit: 10,
        });

        setRequests(res.requests);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch (err: any) {
        console.error("Collab fetch error:", err);
        setError("Could not load requests.");
      } finally {
        setLoading(false);
      }
    },
    [supabase, debouncedSearch, roleSlug, workMode, savedOnly]
  );

  // Trigger load on filter change
  useEffect(() => {
    loadRequests(true);
  }, [loadRequests]);

  // Infinite scroll load more
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const searchTerm =
        debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : null;

      const res = await getCollabRequests(supabase, {
        search: searchTerm,
        roleSlug: roleSlug || null,
        workMode: (workMode as WorkMode) || null,
        savedOnly,
        cursorCreatedAt: cursor.created_at,
        cursorId: cursor.id,
        limit: 10,
      });

      setRequests((prev) => [...prev, ...res.requests]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Collab pagination error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, hasMore, supabase, debouncedSearch, roleSlug, workMode, savedOnly]);

  // Observer on sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore, loading]);

  return (
    <div className="space-y-4">
      {/* Search and New Request Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
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

        <Link
          href="/collaborate/new"
          className="px-4 py-2.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold rounded-xl flex items-center space-x-1.5 shrink-0 transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
          <span>New request</span>
        </Link>
      </div>

      {/* Dropdown Filters & Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          {/* Roles Dropdown */}
          <select
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#1C1E1E] border border-[#303232] rounded-xl text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
          >
            <option value="">All roles</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Work Mode Dropdown */}
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#1C1E1E] border border-[#303232] rounded-xl text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
          >
            <option value="">Any mode</option>
            <option value="remote">Remote</option>
            <option value="in_person">In person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Saved Toggle and Mine Link */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setSavedOnly((prev) => !prev)}
            aria-label="Filter saved requests"
            title={savedOnly ? "Showing saved requests" : "Show saved requests"}
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

          <Link
            href="/collaborate/mine"
            className="px-3.5 py-2 text-xs font-semibold bg-[#1C1E1E] hover:bg-[#252727] border border-[#303232] text-[#E6E6E6] rounded-xl transition-colors"
          >
            Mine
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-[#1C1E1E] border border-[#303232] rounded-2xl flex items-center justify-between text-xs font-mono">
          <span className="text-red-400">{error}</span>
          <button
            type="button"
            onClick={() => loadRequests(true)}
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
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center border border-dashed border-[#303232] rounded-2xl p-6">
          <p className="text-sm text-[#878787]">
            {savedOnly ? "No saved requests." : "No requests found."}
          </p>
        </div>
      ) : (
        /* Single column of cards */
        <div className="space-y-4 pt-1">
          {requests.map((req) => (
            <CollabCard
              key={req.id}
              request={req}
              currentUserId={currentUserId}
              isRestricted={isRestricted}
              onApplySuccess={() => {
                setRequests((prev) =>
                  prev.map((r) =>
                    r.id === req.id
                      ? { ...r, has_applied: true, applicant_count: r.applicant_count + 1 }
                      : r
                  )
                );
              }}
            />
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-[#6C86FF] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

