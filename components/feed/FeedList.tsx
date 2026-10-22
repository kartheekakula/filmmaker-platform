"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FilmWithCreator } from "@/lib/types";
import { FilmCard } from "./FilmCard";
import { SkeletonCard } from "./SkeletonCard";
import { ScrollPreviewProvider } from "./ScrollPreviewContext";
import { FeedCursor, getFilmsFeed, getPopularFilms, getExploreFilms } from "@/lib/films";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Plus } from "lucide-react";

interface FeedListProps {
  initialFilms: FilmWithCreator[];
  initialCursor?: FeedCursor | null;
  hasMoreInitial: boolean;
  feedType?: "home" | "channel" | "popular" | "explore";
  categorySlug?: string;
  currentUserId?: string | null;
  emptyTitle?: string;
  emptySubtitle?: string;
}

export function FeedList({
  initialFilms,
  initialCursor = null,
  hasMoreInitial,
  feedType = "home",
  categorySlug,
  currentUserId,
  emptyTitle = "No posts found",
  emptySubtitle = "Be the first to post here.",
}: FeedListProps) {
  const [films, setFilms] = useState<FilmWithCreator[]>(initialFilms);
  const [cursor, setCursor] = useState<FeedCursor | null>(initialCursor);
  const [offset, setOffset] = useState<number>(initialFilms.length);
  const [hasMore, setHasMore] = useState<boolean>(hasMoreInitial);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFilms(initialFilms);
    setCursor(initialCursor);
    setOffset(initialFilms.length);
    setHasMore(hasMoreInitial);
  }, [initialFilms, initialCursor, hasMoreInitial]);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const triggerEl = loadMoreRef.current;
    if (!triggerEl) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          try {
            const supabase = createClient();
            if (feedType === "popular") {
              const res = await getPopularFilms(supabase, {
                limit: 10,
                offset,
                userId: currentUserId,
              });
              setFilms((prev) => [...prev, ...res.films]);
              setOffset((prev) => prev + res.films.length);
              setHasMore(res.hasMore);
            } else if (feedType === "explore") {
              const res = await getExploreFilms(supabase, {
                limit: 10,
                cursor,
                userId: currentUserId,
              });
              setFilms((prev) => [...prev, ...res.films]);
              setCursor(res.nextCursor);
              setHasMore(res.hasMore);
            } else {
              // home or channel
              const res = await getFilmsFeed(supabase, {
                limit: 10,
                cursor,
                categorySlug,
                userId: currentUserId,
              });
              setFilms((prev) => [...prev, ...res.films]);
              setCursor(res.nextCursor);
              setHasMore(res.hasMore);
            }
          } catch (err) {
            console.error("Failed to load more works:", err);
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, cursor, offset, feedType, categorySlug, currentUserId]);

  if (films.length === 0 && !isLoadingMore) {
    return (
      <div className="w-full bg-[#1C1E1E] border border-[#2B2D2D] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 mx-auto bg-[#242626] border border-[#303232] rounded-full flex items-center justify-center text-[#878787]">
          <Sparkles className="w-6 h-6 stroke-[1.5] text-[#6C86FF]" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading text-lg text-[#E6E6E6]">{emptyTitle}</h3>
          <p className="text-xs text-[#878787] max-w-sm mx-auto leading-relaxed">{emptySubtitle}</p>
        </div>
        <div className="pt-2">
          <Link
            href="/post"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold rounded-xl uppercase tracking-wider transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2]" />
            <span>Post</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ScrollPreviewProvider>
      <div className="space-y-6">
        {films.map((film) => (
          <FilmCard
            key={film.id}
            film={film}
            currentUserId={currentUserId}
          />
        ))}

        {/* Loading skeleton when loading next page */}
        {isLoadingMore && (
          <div className="space-y-6 pt-2">
            <SkeletonCard />
          </div>
        )}

        {/* Intersection sentinel */}
        {hasMore && <div ref={loadMoreRef} className="h-4 w-full" />}

        {/* End of Feed */}
        {!hasMore && films.length > 0 && (
          <div className="py-10 text-center text-xs font-mono text-[#878787] border-t border-[#303232]">
            End of showcase
          </div>
        )}
      </div>
    </ScrollPreviewProvider>
  );
}
