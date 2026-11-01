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
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
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

  // Carousel & Image lightbox state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  const postType = film.post_type || "video";
  const isActive = postType === "video" && activeFilmId === film.id && previewsEnabled;
  const previewStart = 0;

  const images = (film.media_urls && film.media_urls.length > 0
    ? film.media_urls
    : [film.thumbnail_url]
  ).filter(Boolean) as string[];

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

  // Image lightbox keyboard navigation
  useEffect(() => {
    if (!showImageLightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowImageLightbox(false);
      } else if (e.key === "ArrowLeft") {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImageLightbox, images.length]);

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
        className="w-full bg-[#232525] border border-[#303232] overflow-hidden"
      >
        {/* 1. Creator Header Row */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Square Creator Avatar */}
            <Link
              href={`/u/${creator.username}`}
              className="w-10 h-10 bg-[#002EC1] shrink-0 flex items-center justify-center font-bold text-sm text-[#E6E6E6] overflow-hidden select-none"
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

            {/* Creator Info */}
            <div className="min-w-0 flex flex-col justify-center">
              <Link
                href={`/u/${creator.username}`}
                className="text-sm font-semibold text-[#E6E6E6] hover:text-[#6C86FF] transition-colors truncate block"
              >
                {creator.display_name || creator.username}
              </Link>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-[#878787]">
                <span>@{creator.username}</span>
                <span>•</span>
                <span>{formatRelativeTime(film.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Channel Pill Badge & Post Menu */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <Link
              href={`/c/${categorySlug}`}
              className="px-2.5 py-1 bg-[#252727] hover:bg-[#2F3131] border border-[#303232] text-[#6C86FF] text-[11px] font-mono uppercase tracking-tight transition-colors"
            >
              c/{channelName}
            </Link>
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

        {/* 2. Media Area by Post Type */}
        {postType === "writing" ? (
          <div className="p-5 sm:p-6 bg-[#1A1C1C] border-b border-[#2B2D2D] space-y-3">
            <Link href={`/f/${film.id}`}>
              <h2 className="font-heading text-xl sm:text-2xl text-[#E6E6E6] hover:text-[#6C86FF] transition-colors leading-snug">
                {title}
              </h2>
            </Link>
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
          /* Reddit-style Full Image Display: uncropped, adaptive height up to 580px */
          <div className="relative w-full bg-[#000000] overflow-hidden select-none flex items-center justify-center max-h-[580px] sm:max-h-[640px] group">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[activeImageIndex]}
                alt={`${title} - ${activeImageIndex + 1}`}
                className="w-full h-auto max-h-[580px] sm:max-h-[640px] object-contain cursor-pointer transition-opacity duration-150"
                loading="lazy"
                onClick={() => setShowImageLightbox(true)}
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center text-xs text-[#878787]">
                No image available
              </div>
            )}

            {/* Click to expand hint overlay */}
            <button
              type="button"
              onClick={() => setShowImageLightbox(true)}
              className="absolute top-3 left-3 p-1.5 bg-black/70 hover:bg-black text-[#E6E6E6] border border-[#303232] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
              title="View full image"
              aria-label="View full image"
            >
              <Maximize2 size={14} strokeWidth={1.5} />
            </button>

            {/* Multiple Images Navigation Controls */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 bg-black/75 hover:bg-black text-[#E6E6E6] border border-[#303232] transition-colors z-20 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-black/75 hover:bg-black text-[#E6E6E6] border border-[#303232] transition-colors z-20 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>

                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/80 border border-[#303232] text-[11px] font-mono text-[#E6E6E6] z-10">
                  {activeImageIndex + 1}/{images.length}
                </div>
              </>
            )}
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

        {/* 3. Action Bar: Like, Comment, Share */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
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
                <span className="flex items-center space-x-1 text-xs font-mono text-[#6C86FF] bg-[#0B1A4A] px-2 py-0.5">
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
                {title}
              </h2>
            </Link>

            {caption && (
              <p className="text-sm text-[#A8A8A8] font-sans leading-relaxed line-clamp-3">
                {caption}
              </p>
            )}
          </div>
        )}
      </article>

      {/* Reddit-style Full Image Lightbox Modal */}
      {showImageLightbox && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4"
          onClick={() => setShowImageLightbox(false)}
        >
          {/* Modal Top Bar */}
          <div
            className="flex items-center justify-between z-10 w-full max-w-6xl mx-auto pb-2 border-b border-[#303232]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h4 className="text-sm font-semibold text-[#E6E6E6] truncate">{title}</h4>
              <p className="text-xs text-[#878787] font-mono">
                Image {activeImageIndex + 1} of {images.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowImageLightbox(false)}
              className="p-1.5 text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#232525] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer"
              aria-label="Close image viewer"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Modal Centered Image */}
          <div
            className="flex-1 flex items-center justify-center relative w-full max-w-6xl mx-auto my-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeImageIndex]}
              alt={`${title} - full image ${activeImageIndex + 1}`}
              className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain select-none"
            />

            {/* Nav Arrows if multiple */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-[#232525]/90 hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] transition-colors cursor-pointer"
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#232525]/90 hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] transition-colors cursor-pointer"
                  aria-label="Next"
                >
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div
            className="w-full max-w-6xl mx-auto pt-2 flex items-center justify-between text-xs text-[#878787] font-mono border-t border-[#303232]"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Click backdrop or press Esc to close</span>
            <Link
              href={`/f/${film.id}`}
              className="text-[#6C86FF] hover:underline"
              onClick={() => setShowImageLightbox(false)}
            >
              Open post comments →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
