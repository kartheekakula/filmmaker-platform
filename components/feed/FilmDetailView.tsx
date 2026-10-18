"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Eye, ArrowLeft, Share2, Check } from "lucide-react";
import { FilmWithCreator } from "@/lib/types";
import { formatDuration, toggleFilmLike, incrementFilmView } from "@/lib/films";
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
  const [viewCount, setViewCount] = useState<number>(film.view_count || 0);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Increment view once per session
  useEffect(() => {
    const sessionKey = `viewed_film_${film.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      incrementFilmView(supabase, film.id);
      setViewCount((prev) => prev + 1);
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

  const creator = film.profiles;
  const channelSlug = film.category_slug;
  const channelName = film.categories?.name || channelSlug;

  return (
    <div className="space-y-6 max-w-[760px] mx-auto pb-12">
      {/* Top Back Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Back</span>
        </button>

        <Link
          href={`/c/${channelSlug}`}
          className="text-xs font-mono text-[#6C86FF] hover:underline uppercase tracking-wider"
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

      {/* Film Information & Actions */}
      <div className="bg-[#232525] border border-[#303232] p-6 space-y-6 rounded-2xl shadow-xl">
        {/* Title and Metadata Strip */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#878787]">
            <span className="px-2.5 py-0.5 bg-[#000000]/80 border border-[#303232] text-[#E6E6E6] rounded-full">
              {formatDuration(film.duration_seconds)}
            </span>
            {film.genre && (
              <span className="px-2.5 py-0.5 bg-[#2E3030] text-[#A8A8A8] rounded-full">
                {film.genre}
              </span>
            )}
            {film.language && (
              <span className="text-[#878787]">{film.language}</span>
            )}
            <span>•</span>
            <span className="text-[#878787]">
              {new Date(film.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl tracking-tight text-[#E6E6E6] leading-snug">
            {film.title}
          </h1>
        </div>

        {/* Action Buttons: Instagram-style Like, Views, Share */}
        <div className="pt-2 border-t border-[#303232] flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={handleLike}
              disabled={isLiking}
              className={`inline-flex items-center space-x-2.5 px-4 py-2 border transition-all duration-200 text-sm font-semibold rounded-xl cursor-pointer ${
                hasLiked
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#6C86FF] shadow-sm shadow-[#6C86FF]/20"
                  : "bg-[#2E3030] border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#353838]"
              } active:scale-95`}
            >
              <Heart
                className={`w-5 h-5 stroke-[1.8] transition-transform duration-200 ${
                  hasLiked ? "fill-[#6C86FF] text-[#6C86FF] scale-110" : "text-[#A8A8A8]"
                }`}
              />
              <span className="font-mono text-xs">{likeCount}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#2E3030] hover:bg-[#353838] border border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] transition-all duration-200 text-xs font-mono rounded-xl cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#6C86FF] stroke-[1.8]" />
                  <span className="text-[#6C86FF] font-semibold">Link copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 stroke-[1.8]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-mono text-[#878787]">
            <Eye className="w-4 h-4 stroke-[1.5]" />
            <span>{viewCount} views</span>
          </div>
        </div>

        {/* Creator Block */}
        <div className="pt-4 border-t border-[#303232] flex items-center justify-between">
          <Link
            href={`/u/${creator.username}`}
            className="flex items-center space-x-3.5 group min-w-0"
          >
            <div className="w-11 h-11 bg-[#002EC1] border border-[#303232] rounded-full shrink-0 flex items-center justify-center text-[#E6E6E6] font-bold text-sm overflow-hidden shadow-sm">
              {creator.avatar_url ? (
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
              <p className="text-xs font-mono text-[#878787] truncate">
                @{creator.username}
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

        {/* Caption & Premise */}
        {film.caption && (
          <div className="pt-4 border-t border-[#303232] space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#878787]">
              Artist Note / Premise
            </h3>
            <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-wrap font-sans">
              {film.caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
