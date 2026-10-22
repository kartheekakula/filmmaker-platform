"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Eye, Share2, Check, MessageSquare } from "lucide-react";
import { FilmWithCreator } from "@/lib/types";
import { toggleFilmLike } from "@/lib/films";
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
  const [copied, setCopied] = useState<boolean>(false);

  const postType = film.post_type || "video";
  const isActive = postType === "video" && activeFilmId === film.id && previewsEnabled;
  const previewStart = 0;

  // Intersection Observer for 60% visibility & 400ms debounce
  useEffect(() => {
    if (!previewsEnabled || postType !== "video") return;
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
  }, [film.id, activeFilmId, setActiveFilmId, previewsEnabled, postType]);

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

    setHasLiked(!previousLiked);
    setLikeCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsLiking(true);

    try {
      const supabase = createClient();
      await toggleFilmLike(supabase, film.id, currentUserId, previousLiked);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setHasLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (navigator.clipboard) {
        const url = `${window.location.origin}/f/${film.id}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  };

  const creator = film.profiles;
  const channelSlug = film.category_slug;
  const channelName = film.categories?.name || channelSlug;

  return (
    <article
      ref={cardRef}
      id={`film-${film.id}`}
      className="bg-[#232525] border border-[#303232] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#6C86FF]/40 shadow-lg"
    >
      {/* 1. Header Bar: Profile Info + Channel Badge */}
      <div className="p-4 flex items-center justify-between border-b border-[#2B2D2D]">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            href={`/u/${creator.username}`}
            className="shrink-0 w-9 h-9 bg-[#002EC1] rounded-full ring-2 ring-[#2B2D2D] flex items-center justify-center text-[#E6E6E6] font-semibold text-xs overflow-hidden hover:ring-[#6C86FF]/50 transition-all"
          >
            {creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(creator.display_name || creator.username || "?").charAt(0).toUpperCase()}</span>
            )}
          </Link>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              <Link
                href={`/u/${creator.username}`}
                className="text-sm font-medium text-[#E6E6E6] hover:text-[#6C86FF] truncate transition-colors"
              >
                {creator.display_name || creator.username}
              </Link>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-[#878787]">
              <span>@{creator.username}</span>
              <span>•</span>
              <span>{formatRelativeTime(film.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Channel Pill Badge */}
        <Link
          href={`/c/${channelSlug}`}
          className="px-2.5 py-1 rounded-full bg-[#252727] hover:bg-[#2F3131] border border-[#303232] text-[#6C86FF] text-[11px] font-mono uppercase tracking-tight shrink-0 transition-colors"
        >
          c/{channelName}
        </Link>
      </div>

      {/* 2. Media Area by Post Type */}
      {postType === "writing" ? (
        <div className="p-5 sm:p-6 bg-[#1A1C1C] border-b border-[#2B2D2D] space-y-3">
          <Link href={`/f/${film.id}`}>
            <h2 className="font-heading text-xl sm:text-2xl text-[#E6E6E6] hover:text-[#6C86FF] transition-colors leading-snug">
              {film.title}
            </h2>
          </Link>
          <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-6 whitespace-pre-wrap">
            {film.body || film.caption || ""}
          </p>
          <div>
            <Link
              href={`/f/${film.id}`}
              className="inline-block text-xs font-mono text-[#6C86FF] hover:underline"
            >
              Read more →
            </Link>
          </div>
        </div>
      ) : postType === "image" ? (
        <div className="relative aspect-video sm:aspect-[16/10] w-full bg-[#000000] overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={film.media_urls?.[0] || film.thumbnail_url || ""}
            alt={film.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {film.media_urls && film.media_urls.length > 1 && (
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-[#000000]/80 backdrop-blur border border-[#303232] text-[11px] font-mono text-[#E6E6E6] rounded-full z-10">
              1/{film.media_urls.length}
            </div>
          )}
          <Link
            href={`/f/${film.id}`}
            className="absolute inset-0 z-20"
            aria-label={`View ${film.title}`}
          />
        </div>
      ) : (
        /* Video Frame (16:9 Aspect Ratio) */
        <div className="relative aspect-video w-full bg-[#000000] overflow-hidden select-none">
          {/* Poster Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={film.thumbnail_url || `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`}
            alt={film.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Scroll Preview Overlay */}
          {isActive && film.youtube_id && (
            <div className="absolute inset-0 bg-[#000000] z-20">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${film.youtube_id}?autoplay=1&mute=1&controls=0&start=${previewStart}&end=${previewStart + 10}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                title={`Preview: ${film.title}`}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay; encrypted-media"
              />

              {/* 3px Bottom Progress Line */}
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

          {/* Full-frame Link to detail */}
          <Link
            href={`/f/${film.id}`}
            className="absolute inset-0 z-20"
            aria-label={`Watch ${film.title}`}
          />
        </div>
      )}

      {/* 3. Action Bar: Like, Comment, Share */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          {/* Heart / Like Button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className="group flex items-center space-x-1.5 focus:outline-none"
            aria-label={hasLiked ? "Unlike work" : "Like work"}
          >
            <Heart
              className={`w-5 h-5 stroke-[1.5] transition-all duration-200 group-hover:scale-110 active:scale-90 ${
                hasLiked
                  ? "fill-[#6C86FF] text-[#6C86FF]"
                  : "text-[#E6E6E6] group-hover:text-[#6C86FF]"
              }`}
            />
            <span className="text-xs font-mono text-[#E6E6E6]">{likeCount}</span>
          </button>

          {/* Comment Button (links to comments) */}
          <Link
            href={`/f/${film.id}#comments-section`}
            className="group flex items-center space-x-1.5 text-[#E6E6E6] hover:text-[#6C86FF] transition-colors focus:outline-none"
            aria-label="Comments"
          >
            <MessageSquare className="w-5 h-5 stroke-[1.5] group-hover:scale-110 active:scale-90 transition-transform" />
            <span className="text-xs font-mono">{film.comment_count || 0}</span>
          </Link>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="group flex items-center space-x-1 text-[#E6E6E6] hover:text-[#6C86FF] transition-colors focus:outline-none"
            aria-label="Share work"
          >
            {copied ? (
              <span className="flex items-center space-x-1 text-xs font-mono text-[#6C86FF] bg-[#0B1A4A] px-2 py-0.5 rounded-full">
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </span>
            ) : (
              <Share2 className="w-5 h-5 stroke-[1.5] group-hover:scale-110 active:scale-90 transition-transform" />
            )}
          </button>
        </div>

        {/* View Count */}
        <div className="flex items-center space-x-1.5 text-xs font-mono text-[#878787]">
          <Eye className="w-4 h-4 stroke-[1.5]" />
          <span>{film.view_count || 0} views</span>
        </div>
      </div>

      {/* 4. Editorial Title & Caption (for video and image types) */}
      {postType !== "writing" && (
        <div className="px-4 pb-3 space-y-1.5">
          <Link href={`/f/${film.id}`}>
            <h2 className="font-heading text-xl sm:text-2xl text-[#E6E6E6] hover:text-[#6C86FF] transition-colors leading-snug">
              {film.title}
            </h2>
          </Link>

          {film.caption && (
            <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-3">
              {film.caption}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
