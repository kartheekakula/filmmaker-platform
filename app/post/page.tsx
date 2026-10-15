"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/shell/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { Category, Profile } from "@/lib/types";
import {
  extractYouTubeId,
  formatDuration,
  parseDuration,
  createFilm,
  getCategories,
} from "@/lib/films";
import { Film as FilmIcon, AlertCircle, CheckCircle2, Lock } from "lucide-react";

export default function PostPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [videoUrl, setVideoUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [durationStr, setDurationStr] = useState("01:30");
  const [categorySlug, setCategorySlug] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("Telugu");
  const [previewStart, setPreviewStart] = useState("0");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check auth and load categories
  useEffect(() => {
    async function loadInitialData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAuthChecked(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile as Profile);
      setAuthChecked(true);

      const cats = await getCategories(supabase);
      setCategories(cats);
      if (cats.length > 0 && !categorySlug) {
        setCategorySlug(cats[0].slug);
      }
    }

    loadInitialData();
  }, [supabase]);

  // Real-time YouTube link validation
  useEffect(() => {
    if (!videoUrl.trim()) {
      setYoutubeId(null);
      return;
    }
    const id = extractYouTubeId(videoUrl);
    setYoutubeId(id);
  }, [videoUrl]);

  const parsedDuration = parseDuration(durationStr);
  const isDurationValid =
    parsedDuration !== null && parsedDuration >= 1 && parsedDuration <= 180;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!youtubeId) {
      setErrorMsg("Please provide a valid YouTube microfilm link.");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Please enter a film title.");
      return;
    }

    if (!isDurationValid || !parsedDuration) {
      setErrorMsg("Duration must be in mm:ss format and 3:00 or less (1 to 180 seconds).");
      return;
    }

    if (!categorySlug) {
      setErrorMsg("Please select a channel category.");
      return;
    }

    const previewSeconds = parseInt(previewStart, 10) || 0;
    if (previewSeconds < 0 || previewSeconds > parsedDuration) {
      setErrorMsg(`Preview start must be between 0 and ${parsedDuration} seconds.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createFilm(supabase, currentUser.id, {
        title: title.trim(),
        caption: caption.trim() || null,
        genre: genre.trim() || null,
        language: language.trim() || null,
        duration_seconds: parsedDuration,
        video_url: videoUrl.trim(),
        youtube_id: youtubeId,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        preview_start_seconds: previewSeconds,
        category_slug: categorySlug,
      });

      router.push(`/f/${created.id}`);
    } catch (err: unknown) {
      console.error("Film publishing failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to publish film. Please try again.";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  if (authChecked && !currentUser) {
    return (
      <AppLayout title="Post">
        <div className="bg-[#232525] border border-[#303232] p-8 text-center space-y-4 rounded-2xl shadow-xl">
          <div className="w-12 h-12 mx-auto bg-[#2E3030] border border-[#303232] rounded-full flex items-center justify-center text-[#878787]">
            <Lock className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[#E6E6E6]">Sign in required</h2>
            <p className="text-xs text-[#878787] max-w-sm mx-auto">
              You must be logged in to publish creative works to the community channels.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-6 py-2.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold uppercase tracking-wider transition-all duration-200 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              Sign in to Post
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const selectedCategoryObj = categories.find((c) => c.slug === categorySlug);
  const selectedCategoryName = selectedCategoryObj?.name || categorySlug;

  return (
    <AppLayout title="Publish Work">
      <div className="space-y-6 max-w-[680px] mx-auto">
        {/* Header Intro */}
        <div className="border-b border-[#303232] pb-4">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#E6E6E6]">
            Publish Your Work
          </h1>
          <p className="text-xs text-[#878787] mt-1">
            Telugu-first 1 to 3 minute creative pieces. Add your YouTube link, choose your craft channel, and review the live card preview below.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-[#0B1A4A] border border-[#6C86FF]/50 text-xs text-[#E6E6E6] flex items-start space-x-2.5 rounded-xl shadow-md">
            <AlertCircle className="w-4 h-4 text-[#6C86FF] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* YouTube URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
              YouTube Video URL <span className="text-[#6C86FF]">*</span>
            </label>
            <input
              type="url"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/... or https://www.youtube.com/watch?v=..."
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
            />
            {youtubeId ? (
              <p className="text-[11px] font-mono text-[#6C86FF] flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>YouTube ID verified: {youtubeId}</span>
              </p>
            ) : videoUrl.trim() ? (
              <p className="text-[11px] font-mono text-red-400">
                Invalid YouTube link. Ensure it contains a valid video ID.
              </p>
            ) : null}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
              Title <span className="text-[#6C86FF]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title in English or Telugu (e.g. Maya - మాయ)"
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
            />
          </div>

          {/* Duration & Preview Start */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Duration (mm:ss) <span className="text-[#6C86FF]">*</span>
              </label>
              <input
                type="text"
                required
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                placeholder="01:30"
                className={`w-full px-3.5 py-2.5 bg-[#1A1C1C] border text-[#E6E6E6] text-sm font-mono focus:outline-none transition-colors rounded-xl ${
                  isDurationValid
                    ? "border-[#303232] focus:border-[#6C86FF]"
                    : "border-red-500 focus:border-red-500"
                }`}
              />
              <p className="text-[11px] text-[#878787] font-mono">
                Max 3:00 (1 to 180 seconds). Current: {parsedDuration ? `${parsedDuration}s` : "invalid"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Preview Start (seconds)
              </label>
              <input
                type="number"
                min={0}
                max={parsedDuration || 180}
                value={previewStart}
                onChange={(e) => setPreviewStart(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] text-sm font-mono focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
              <p className="text-[11px] text-[#878787] font-mono">
                Timestamp where the 10s scroll preview begins.
              </p>
            </div>
          </div>

          {/* Channel Selection (Required) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
              Channel / Discipline <span className="text-[#6C86FF]">*</span>
            </label>
            <select
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
            >
              <option value="" disabled>
                Select a channel (required)
              </option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug} className="bg-[#1A1C1C]">
                  {cat.name} (c/{cat.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Genre and Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Genre / Medium
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Drama, Thriller, Visual Poetry"
                className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Language
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Telugu"
                className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>
          </div>

          {/* Caption (max 160 chars) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Caption / Statement (Max 160 characters)
              </label>
              <span
                className={`text-[11px] font-mono ${
                  caption.length > 160 ? "text-red-400 font-bold" : "text-[#878787]"
                }`}
              >
                {caption.length} / 160
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={160}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Short premise or artist note in English or Telugu..."
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] resize-none transition-colors rounded-xl"
            />
          </div>

          {/* Live Feed Preview Card (Instagram psychological layout) */}
          <div className="pt-4 border-t border-[#303232] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#878787]">
                Live Feed Preview
              </span>
              <span className="text-[11px] font-mono text-[#6C86FF]">
                How artists will see your card
              </span>
            </div>

            <div className="border border-[#303232] bg-[#232525] overflow-hidden rounded-2xl shadow-xl">
              {/* Creator row */}
              <div className="p-3.5 flex items-center justify-between text-xs border-b border-[#303232]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#002EC1] flex items-center justify-center text-[#E6E6E6] font-semibold text-xs overflow-hidden shadow-sm">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser?.display_name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div>
                    <span className="text-[#E6E6E6] font-medium block leading-tight">
                      {currentUser?.display_name || currentUser?.username || "You"}
                    </span>
                    <span className="text-[#6C86FF] font-mono text-[11px]">
                      c/{selectedCategoryName || "channel"}
                    </span>
                  </div>
                </div>
                <span className="text-[#878787] text-[11px] font-mono">Just now</span>
              </div>

              {/* Poster frame */}
              <div className="relative aspect-video w-full bg-[#000000]">
                {youtubeId ? (
                  <img
                    src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#878787] space-y-1.5">
                    <FilmIcon className="w-8 h-8 stroke-[1]" />
                    <span className="text-xs font-mono">Enter YouTube link to load poster</span>
                  </div>
                )}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-[#000000]/85 border border-[#303232] text-[10px] font-mono text-[#E6E6E6] rounded-md">
                  {parsedDuration ? formatDuration(parsedDuration) : "01:30"}
                </div>
              </div>

              {/* Content area: Title, Actions & Caption */}
              <div className="p-4 space-y-2.5">
                <h3 className="font-serif text-lg font-medium text-[#E6E6E6] leading-snug">
                  {title || "Untitled Artwork"}
                </h3>

                {caption && (
                  <p className="text-xs text-[#A8A8A8] leading-relaxed line-clamp-2">
                    {caption}
                  </p>
                )}

                {/* Instagram Action Row */}
                <div className="pt-2 border-t border-[#303232] flex items-center justify-between text-xs">
                  <span className="text-[#6C86FF] font-semibold text-xs">0 likes</span>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[#878787]">
                    {genre && <span className="px-2 py-0.5 bg-[#2E3030] text-[#A8A8A8] rounded-full">{genre}</span>}
                    <span>{language}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !youtubeId || !isDurationValid || !title.trim()}
              className="w-full py-3.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] disabled:bg-[#2E3030] disabled:text-[#878787] text-[#E6E6E6] text-xs font-semibold uppercase tracking-wider transition-all duration-200 rounded-xl cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Publishing work..." : "Publish Artwork"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
