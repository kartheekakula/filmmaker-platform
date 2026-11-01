"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Eye,
  Share2,
  Check,
  MessageSquare,
} from "lucide-react";
import { FilmWithCreator } from "@/lib/types";
import { toggleFilmLike } from "@/lib/films";
import { useScrollPreview } from "./ScrollPreviewContext";
import { createClient } from "@/lib/supabase/client";
import { PostMenu } from "./PostMenu";
import { CATEGORIES } from "@/lib/constants";

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

  // Local state for editable post fields & deletion
  const [isDeleted, setIsDeleted] = useState(false);
  const [title, setTitle] = useState(film.title);
  const [caption, setCaption] = useState(film.caption);
  const [body, setBody] = useState(film.body);
  const [categorySlug, setCategorySlug] = useState(film.category_slug);

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
        await navigator.clipboard.writeText(`${window.location.origin}/f/${film.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  if (isDeleted) {
    return null;
  }

  const creator = film.profiles || {
    id: film.owner_id,
    username: "creator",
    display_name: "Independent Creator",
    avatar_url: null,
  };

  const currentCategory = CATEGORIES.find((c) => c.slug === categorySlug);
  const channelName = currentCategory?.name || film.categories?.name || categorySlug;

  return (
    <>
      <article
        ref={cardRef}
        data-film-id={film.id}
        className="w-full bg-[#232525] border border-[#303232] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[#6C86FF]/40 shadow-lg"
      >
        {/* 1. Creator Header Row */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Rounded Creator Avatar */}
            <Link
              href={`/u/${creator.username}`}
              className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-[#E6E6E6] overflow-hidden select-none ring-2 ring-[#2B2D2D]"
            >
              {creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (creator.display_name?.[0] || creator.username?.[0] || "A").toUpperCase()
              )}
            </Link>

            {/* Creator Info & Channel */}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <Link
                href={`/u/${creator.username}`}
                className="text-sm font-semibold text-[#E6E6E6] hover:text-[#6C86FF] transition-colors truncate block"
              >
                {creator.display_name || creator.username}
              </Link>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-[#878787] truncate">
                <Link
                  href={`/c/${categorySlug}`}
                  className="text-[#6C86FF] hover:underline uppercase tracking-tight shrink-0 font-medium"
                >
                  c/{channelName}
                </Link>
                <span>•</span>
                <span className="shrink-0">{formatRelativeTime(film.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Post Menu */}
          <div className="shrink-0 flex items-center">
            <PostMenu
              filmId={film.id}
              ownerId={film.owner_id}
              currentUserId={currentUserId ?? null}
              postType={postType}
              initialTitle={title}
              initialCaption={caption}
              initialBody={body}
              initialCategorySlug={categorySlug}
              onUpdate={(updated) => {
                setTitle(updated.title);
                setCaption(updated.caption);
                setBody(updated.body);
                setCategorySlug(updated.category_slug);
              }}
              onDelete={() => setIsDeleted(true)}
            />
          </div>
        </div>

        {/* 2. Post Title (Above the Post Media) */}
        <div className="px-4 pt-0.5 pb-3">
          <Link href={`/f/${film.id}`} className="group block">
            <h2 className="font-heading text-xl sm:text-2xl text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors leading-snug">
              {title}
            </h2>
          </Link>
        </div>

        {/* 3. Media Area by Post Type */}
        {postType === "writing" ? (
          <div className="px-5 py-4 bg-[#1A1C1C] border-y border-[#2B2D2D] space-y-3">
            <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {body || caption || ""}
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
          /* Reddit-style Image Feed Preview (Previous Version: 16:9 / 16:10, links directly to post) */
          <div className="relative aspect-video sm:aspect-[16/10] w-full bg-[#000000] overflow-hidden select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={film.media_urls?.[0] || film.thumbnail_url || ""}
              alt={title}
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
              aria-label={`View ${title}`}
            />
          </div>
        ) : (
          /* Video Frame (16:9 Aspect Ratio) */
          <div className="relative aspect-video w-full bg-[#000000] overflow-hidden select-none">
            {/* Poster Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={film.thumbnail_url || `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Scroll Preview Overlay */}
            {isActive && film.youtube_id && (
              <div className="absolute inset-0 bg-[#000000] z-20">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${film.youtube_id}?autoplay=1&mute=1&controls=0&start=${previewStart}&end=${previewStart + 10}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`}
                  title={`Preview: ${title}`}
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
              aria-label={`Watch ${title}`}
            />
          </div>
        )}

        {/* 4. Caption (for media posts with caption) */}
        {postType !== "writing" && caption && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-3">
              {caption}
            </p>
          </div>
        )}

        {/* 5. Action Bar: Like, Comment, Share */}
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-5">
            {/* Heart / Like Button */}
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className="group flex items-center space-x-1.5 focus:outline-none cursor-pointer"
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
              className="group flex items-center space-x-1 text-[#E6E6E6] hover:text-[#6C86FF] transition-colors focus:outline-none cursor-pointer"
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
      </article>
    </>
  );
}
