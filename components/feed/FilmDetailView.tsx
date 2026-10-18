"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowLeft, Share2, Check, MessageSquare } from "lucide-react";
import { FilmWithCreator } from "@/lib/types";
import { toggleFilmLike, incrementFilmView } from "@/lib/films";
import { FollowButton } from "@/components/profile/FollowButton";
import { createClient } from "@/lib/supabase/client";

interface FilmDetailViewProps {
  film: FilmWithCreator;
  currentUserId: string | null;
  initialIsFollowing: boolean;
}

export function FilmDetailView({
  film,
  currentUserId,
  initialIsFollowing,
}: FilmDetailViewProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [hasLiked, setHasLiked] = useState<boolean>(!!film.user_has_liked);
  const [likeCount, setLikeCount] = useState<number>(film.like_count || 0);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Increment view once per session (kept in background, not displayed)
  useEffect(() => {
    const sessionKey = `viewed_film_${film.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      incrementFilmView(supabase, film.id);
    }
  }, [film.id, supabase]);

  const handleLike = async () => {
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
      await toggleFilmLike(supabase, film.id, currentUserId, previousLiked);
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setHasLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Share copy failed:", err);
    }
  };

  const scrollToComments = () => {
    const section = document.getElementById("comments-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const creator = film.profiles;
  const channelSlug = film.category_slug;
  const channelName = film.categories?.name || channelSlug;

  return (
    <div className="space-y-4 max-w-[760px] mx-auto pb-16">
      {/* Top Back Nav & Channel Link */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Back</span>
        </button>

        <Link
          href={`/c/${channelSlug}`}
          className="text-xs text-[#6C86FF] hover:underline uppercase tracking-wider"
        >
          c/{channelName}
        </Link>
      </div>

      {/* Hero Video Player */}
      <div className="relative aspect-video w-full bg-[#000000] border border-[#303232] rounded-2xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${film.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
          title={film.title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Action Row: Like, Comment, Share (Icon-only, stroke 1.5, size 20, small counts) */}
      <div className="flex items-center space-x-6 pt-1">
        <button
          type="button"
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center space-x-1.5 text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
          aria-label="Like"
        >
          <Heart
            size={20}
            strokeWidth={1.5}
            className={hasLiked ? "fill-[#6C86FF] text-[#6C86FF]" : "text-[#A8A8A8]"}
          />
          <span className="text-xs">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={scrollToComments}
          className="flex items-center space-x-1.5 text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
          aria-label="Comment"
        >
          <MessageSquare size={20} strokeWidth={1.5} />
          <span className="text-xs">{(film as unknown as { comment_count?: number }).comment_count || 0}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center space-x-1.5 text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
          aria-label="Share"
        >
          {copied ? (
            <>
              <Check size={20} strokeWidth={1.5} className="text-[#6C86FF]" />
              <span className="text-xs text-[#6C86FF]">Link copied</span>
            </>
          ) : (
            <Share2 size={20} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Poster Row: Avatar, display name, FollowButton */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href={`/u/${creator.username}`}
          className="flex items-center space-x-3 group min-w-0"
        >
          <div className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center text-[#E6E6E6] font-bold text-sm overflow-hidden">
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
          </div>

          <div className="min-w-0 truncate">
            <p className="text-sm font-semibold text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
              {creator.display_name || creator.username}
            </p>
          </div>
        </Link>

        <div>
          <FollowButton
            targetUserId={creator.id}
            initialIsFollowing={initialIsFollowing}
            currentUserId={currentUserId}
            username={creator.username}
          />
        </div>
      </div>

      {/* Caption: Plain text, nothing around it */}
      {film.caption && (
        <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-wrap pt-1">
          {film.caption}
        </p>
      )}

      {/* Comments Anchor & Section */}
      <div id="comments-section" className="pt-6 border-t border-[#303232]">
        {/* Placeholder ready for Item E comments list & input */}
      </div>
    </div>
  );
}
