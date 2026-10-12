"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Eye } from "lucide-react";
import { FilmWithCreator } from "@/lib/types";
import { formatDuration, toggleFilmLike } from "@/lib/films";
import { useScrollPreview } from "./ScrollPreviewContext";
import { createClient } from "@/lib/supabase/client";

interface FilmCardProps {
  film: FilmWithCreator;
  currentUserId?: string | null;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d`;

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function FilmCard({ film, currentUserId }: FilmCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement | null>(null);
  const { activeFilmId, setActiveFilmId, previewsEnabled } = useScrollPreview();

  const [hasLiked, setHasLiked] = useState<boolean>(!!film.user_has_liked);
  const [likeCount, setLikeCount] = useState<number>(film.like_count || 0);
  const [isLiking, setIsLiking] = useState<boolean>(false);

  const isActive = activeFilmId === film.id && previewsEnabled;
  const previewStart = film.preview_start_seconds || 0;

  // Intersection Observer for 60% visibility & 400ms debounce
  useEffect(() => {
    if (!previewsEnabled) return;
    const element = cardRef.current;
    if (!element) return;

    let timer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (!timer) {
            timer = setTimeout(() => {
              setActiveFilmId(film.id);
            }, 400);
          }
        } else {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (activeFilmId === film.id) {
            setActiveFilmId(null);
          }
        }
      },
      {
        threshold: [0.0, 0.6, 1.0],
      }
    );

    observer.observe(element);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [film.id, activeFilmId, setActiveFilmId, previewsEnabled]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    if (isLiking) return;

    const previousLiked = hasLiked;
    const previousCount = likeCount;

    // Optimistic update
    setHasLiked(!previousLiked);
    setLikeCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsLiking(true);

    try {
      const supabase = createClient();
      await toggleFilmLike(supabase, film.id, currentUserId, previousLiked);
    } catch (err) {
      console.error("Like toggle failed:", err);
      // Revert on error
      setHasLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const channelSlug = film.category_slug;
  const channelName = film.categories?.name || channelSlug;
  const creator = film.profiles;

  return (
    <article
      ref={cardRef}
      className="w-full bg-[#232525] border border-[#303232] rounded-none overflow-hidden transition-colors hover:border-[#3E4242]"
    >
      {/* 1. Creator Header */}
      <div className="p-3.5 flex items-center justify-between text-xs border-b border-[#303232]">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Link
            href={`/u/${creator.username}`}
            className="shrink-0 w-7 h-7 bg-[#002EC1] rounded-none flex items-center justify-center text-[#E6E6E6] font-semibold text-xs overflow-hidden"
          >
            {creator.avatar_url ? (
              // Fixed dimensions to avoid layout shift
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="w-full h-full object-cover rounded-none"
              />
            ) : (
              <span>{(creator.display_name || creator.username || "?").charAt(0).toUpperCase()}</span>
            )}
          </Link>

          <div className="flex items-center space-x-1.5 truncate">
            <Link
              href={`/u/${creator.username}`}
              className="text-[#E6E6E6] font-medium hover:text-[#6C86FF] truncate font-sans"
            >
              {creator.display_name || creator.username}
            </Link>
            <span className="text-[#878787]">•</span>
            <Link
              href={`/c/${channelSlug}`}
              className="text-[#6C86FF] hover:underline font-mono text-[11px] tracking-tight uppercase truncate"
            >
              c/{channelName}
            </Link>
          </div>
        </div>

        <span className="text-[#878787] text-[11px] shrink-0 font-mono">
          {formatRelativeTime(film.created_at)}
        </span>
      </div>

      {/* 2. Film Title */}
      <div className="px-3.5 pt-3 pb-2.5">
        <Link href={`/f/${film.id}`}>
          <h2 className="text-base font-semibold text-[#E6E6E6] hover:text-[#6C86FF] transition-colors leading-snug line-clamp-2">
            {film.title}
          </h2>
        </Link>
      </div>

      {/* 3. Poster & Scroll Preview Frame (16:9 Aspect Ratio) */}
      <div className="relative aspect-video w-full bg-[#000000] border-y border-[#303232] overflow-hidden select-none">
        {/* Poster Image */}
        <img
          src={film.thumbnail_url || `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`}
          alt={film.title}
          className="w-full h-full object-cover rounded-none"
          loading="lazy"
        />

        {/* Runtime Badge (bottom-right) */}
        <div className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 bg-[#000000]/85 border border-[#303232] text-[11px] font-mono text-[#E6E6E6] rounded-none z-10">
          {formatDuration(film.duration_seconds)}
        </div>

        {/* Scroll Preview Player & Overlay */}
        {isActive && (
          <div className="absolute inset-0 bg-[#000000] z-20">
            {/* Muted 10s preview YouTube IFrame with pointer-events: none */}
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${film.youtube_id}?autoplay=1&mute=1&controls=0&start=${previewStart}&end=${previewStart + 10}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
              title={`Preview: ${film.title}`}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
            />

            {/* Top-left [untitled]-style PREVIEW badge */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#0B1A4A] border border-[#6C86FF]/40 text-[#6C86FF] text-[10px] font-mono font-bold tracking-wider uppercase rounded-none z-30 pointer-events-none">
              Preview
            </div>

            {/* Bottom 3px #6C86FF Progress Bar animating over 10 seconds */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#303232] z-30 pointer-events-none">
              <div
                className="h-full bg-[#6C86FF]"
                style={{
                  width: "100%",
                  animation: "previewProgress 10s linear forwards",
                }}
              />
            </div>
          </div>
        )}

        {/* Transparent link overlay so any tap opens the film page */}
        <Link
          href={`/f/${film.id}`}
          className="absolute inset-0 z-20"
          aria-label={`Watch ${film.title}`}
        />
      </div>

      {/* 4. Caption */}
      {film.caption && (
        <div className="px-3.5 py-2.5 text-sm text-[#A8A8A8] leading-relaxed line-clamp-3 font-sans">
          {film.caption}
        </div>
      )}

      {/* 5. Footer Metadata & Interactions */}
      <div className="px-3.5 py-2.5 border-t border-[#303232] flex items-center justify-between text-xs text-[#878787]">
        <div className="flex items-center space-x-2">
          {film.genre && (
            <span className="px-2 py-0.5 bg-[#2E3030] text-[#A8A8A8] text-[11px] font-mono rounded-none">
              {film.genre}
            </span>
          )}
          {film.language && (
            <span className="text-[11px] font-mono text-[#878787]">
              {film.language}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* View Count */}
          <div className="flex items-center space-x-1 font-mono text-[11px] text-[#878787]">
            <Eye className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{film.view_count || 0}</span>
          </div>

          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1.5 font-mono text-xs transition-colors ${
              hasLiked
                ? "text-[#6C86FF] font-semibold"
                : "text-[#A8A8A8] hover:text-[#E6E6E6]"
            }`}
            aria-label={hasLiked ? "Unlike film" : "Like film"}
          >
            <Heart
              className={`w-4 h-4 stroke-[1.5] ${
                hasLiked ? "fill-[#6C86FF] text-[#6C86FF]" : "text-[#A8A8A8]"
              }`}
            />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
