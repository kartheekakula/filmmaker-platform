"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/shell/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { Category, Profile, PostType } from "@/lib/types";
import {
  extractYouTubeId,
  formatDuration,
  parseDuration,
  createFilm,
  getCategories,
} from "@/lib/films";
import { resizeImage } from "@/lib/utils/image";
import {
  Film as FilmIcon,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Lock,
  Upload,
  X,
  Loader2,
} from "lucide-react";

interface LocalImage {
  file: File;
  previewUrl: string;
}

export default function PostPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Post Type Selector
  const [postType, setPostType] = useState<PostType>("video");

  // Common Form State
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("Telugu");

  // Video State
  const [videoUrl, setVideoUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [durationStr, setDurationStr] = useState("01:30");
  const [previewStart, setPreviewStart] = useState("0");

  // Writing State
  const [bodyText, setBodyText] = useState("");

  // Image State
  const [selectedImages, setSelectedImages] = useState<LocalImage[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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

  // Handle local image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const availableSlots = 4 - selectedImages.length;

    if (availableSlots <= 0) {
      setErrorMsg("Maximum of 4 images allowed per post.");
      return;
    }

    const newImages: LocalImage[] = [];
    for (const file of files.slice(0, availableSlots)) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("All selected files must be images.");
        continue;
      }
      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }

    if (!categorySlug) {
      setErrorMsg("Please select a channel category.");
      return;
    }

    // Type-specific validations
    if (postType === "video") {
      if (!youtubeId) {
        setErrorMsg("Please provide a valid YouTube microfilm link.");
        return;
      }
      if (!isDurationValid || !parsedDuration) {
        setErrorMsg("Duration must be in mm:ss format and 3:00 or less (1 to 180 seconds).");
        return;
      }
      const previewSeconds = parseInt(previewStart, 10) || 0;
      if (previewSeconds < 0 || previewSeconds > parsedDuration) {
        setErrorMsg(`Preview start must be between 0 and ${parsedDuration} seconds.`);
        return;
      }
    } else if (postType === "writing") {
      if (!bodyText.trim()) {
        setErrorMsg("Please provide written content (storyline, essay, script, or question).");
        return;
      }
    } else if (postType === "image") {
      if (selectedImages.length === 0) {
        setErrorMsg("Please select at least 1 image to upload (up to 4 max).");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (postType === "video") {
        const previewSeconds = parseInt(previewStart, 10) || 0;
        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          caption: caption.trim() || null,
          genre: genre.trim() || null,
          language: language.trim() || null,
          duration_seconds: parsedDuration!,
          video_url: videoUrl.trim(),
          youtube_id: youtubeId!,
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          preview_start_seconds: previewSeconds,
          category_slug: categorySlug,
          post_type: "video",
        });
        router.push(`/f/${created.id}`);
      } else if (postType === "writing") {
        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          caption: caption.trim() || null,
          genre: genre.trim() || null,
          language: language.trim() || null,
          body: bodyText.trim(),
          category_slug: categorySlug,
          post_type: "writing",
        });
        router.push(`/f/${created.id}`);
      } else if (postType === "image") {
        // Upload each selected image to Supabase storage 'post-images' bucket
        const uploadedUrls: string[] = [];
        for (let i = 0; i < selectedImages.length; i++) {
          setUploadProgress(`Optimizing and uploading image ${i + 1} of ${selectedImages.length}...`);
          const img = selectedImages[i];
          const resizedBlob = await resizeImage(img.file, 1600, 1600, 0.88);
          const filePath = `${currentUser.id}/post-${Date.now()}-${i}.webp`;

          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(filePath, resizedBlob, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Failed to upload image ${i + 1}: ${uploadError.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("post-images").getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }

        setUploadProgress("Finalizing post...");
        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          caption: caption.trim() || null,
          genre: genre.trim() || null,
          language: language.trim() || null,
          media_urls: uploadedUrls,
          thumbnail_url: uploadedUrls[0],
          category_slug: categorySlug,
          post_type: "image",
        });
        router.push(`/f/${created.id}`);
      }
    } catch (err: unknown) {
      console.error("Publishing failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to publish work. Please try again.";
      setErrorMsg(msg);
      setIsSubmitting(false);
      setUploadProgress(null);
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

  const isFormValid =
    title.trim().length > 0 &&
    categorySlug.length > 0 &&
    (postType === "video"
      ? !!youtubeId && isDurationValid
      : postType === "writing"
      ? bodyText.trim().length > 0
      : selectedImages.length > 0);

  return (
    <AppLayout title="Publish Work">
      <div className="space-y-6 max-w-[680px] mx-auto pb-16">
        {/* Header Intro */}
        <div className="border-b border-[#303232] pb-4">
          <h1 className="font-heading text-2xl sm:text-3xl tracking-tight text-[#E6E6E6]">
            Publish Your Work
          </h1>
          <p className="text-xs text-[#878787] mt-1">
            Publish microfilms, written scripts/stories, or design artworks to get genuine feedback from the Telugu creative community.
          </p>
        </div>

        {/* Post Type Selector (3 options) */}
        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
            Creative Format <span className="text-[#6C86FF]">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPostType("video")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                postType === "video"
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#E6E6E6]"
                  : "bg-[#1A1C1C] border-[#303232] text-[#A8A8A8] hover:border-[#6C86FF]/50"
              }`}
            >
              <FilmIcon size={20} strokeWidth={1.5} className={postType === "video" ? "text-[#6C86FF]" : ""} />
              <span className="text-xs font-semibold">Video</span>
              <span className="text-[10px] font-mono text-[#878787] hidden sm:inline">1-3 min YouTube</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType("writing")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                postType === "writing"
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#E6E6E6]"
                  : "bg-[#1A1C1C] border-[#303232] text-[#A8A8A8] hover:border-[#6C86FF]/50"
              }`}
            >
              <FileText size={20} strokeWidth={1.5} className={postType === "writing" ? "text-[#6C86FF]" : ""} />
              <span className="text-xs font-semibold">Writing</span>
              <span className="text-[10px] font-mono text-[#878787] hidden sm:inline">Script, Story, Essay</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType("image")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                postType === "image"
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#E6E6E6]"
                  : "bg-[#1A1C1C] border-[#303232] text-[#A8A8A8] hover:border-[#6C86FF]/50"
              }`}
            >
              <ImageIcon size={20} strokeWidth={1.5} className={postType === "image" ? "text-[#6C86FF]" : ""} />
              <span className="text-xs font-semibold">Image</span>
              <span className="text-[10px] font-mono text-[#878787] hidden sm:inline">Art & Design (1-4)</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-[#0B1A4A] border border-[#6C86FF]/50 text-xs text-[#E6E6E6] flex items-start space-x-2.5 rounded-xl shadow-md">
            <AlertCircle className="w-4 h-4 text-[#6C86FF] shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form Fields by Type */}
          {postType === "video" && (
            <>
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
            </>
          )}

          {postType === "image" && (
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                Upload Images (1 to 4 max) <span className="text-[#6C86FF]">*</span>
              </label>

              {/* Upload Input Button */}
              {selectedImages.length < 4 && (
                <label className="border border-dashed border-[#303232] hover:border-[#6C86FF]/60 bg-[#1A1C1C] p-6 rounded-xl flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-[#878787]" />
                  <span className="text-xs font-semibold text-[#E6E6E6]">
                    Select artwork or design images
                  </span>
                  <span className="text-[11px] font-mono text-[#878787]">
                    PNG, JPG, WebP up to 4 MB each ({4 - selectedImages.length} slots left)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}

              {/* Selected Images Grid */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {selectedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-[#303232] bg-[#000000] group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-[#000000]/80 hover:bg-red-600 rounded-full text-[#E6E6E6] transition-colors cursor-pointer"
                        aria-label="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-[#000000]/80 rounded text-[10px] font-mono text-[#E6E6E6]">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title (All Types) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
              Title <span className="text-[#6C86FF]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                postType === "video"
                  ? "Film title in English or Telugu (e.g. Maya - మాయ)"
                  : postType === "writing"
                  ? "Story or Script title in English or Telugu"
                  : "Art piece or Design title"
              }
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
            />
          </div>

          {/* Writing Body (Writing Type Only) */}
          {postType === "writing" && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A8A8]">
                  Written Content / Script / Essay <span className="text-[#6C86FF]">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#878787]">
                  Preserves line breaks • Supports Telugu (UTF-8)
                </span>
              </div>
              <textarea
                required
                rows={10}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Write your story, script scene, synopsis, blog post, or creative question here in Telugu or English..."
                className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] font-sans leading-relaxed transition-colors rounded-xl"
              />
            </div>
          )}

          {/* Channel Selection (Required for all) */}
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
                placeholder={
                  postType === "writing"
                    ? "e.g. Screenplay, Monologue, Review"
                    : postType === "image"
                    ? "e.g. Poster Design, Concept Art"
                    : "e.g. Drama, Thriller, Visual Poetry"
                }
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
                Caption / Artist Statement (Max 160 characters)
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

          {/* Live Feed Preview Card */}
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
                      // eslint-disable-next-line @next/next/no-img-element
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

              {/* Media preview by format */}
              {postType === "writing" ? (
                <div className="p-4 bg-[#1A1C1C] border-b border-[#303232] space-y-2">
                  <h4 className="font-heading text-base text-[#E6E6E6]">
                    {title || "Untitled Writing Piece"}
                  </h4>
                  <p className="text-xs text-[#A8A8A8] line-clamp-4 leading-relaxed whitespace-pre-wrap">
                    {bodyText || "Your story or script text will appear here in the community feed..."}
                  </p>
                  <span className="inline-block text-xs font-mono text-[#6C86FF]">
                    Read more →
                  </span>
                </div>
              ) : postType === "image" ? (
                <div className="relative aspect-video w-full bg-[#000000] overflow-hidden flex items-center justify-center">
                  {selectedImages.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedImages[0].previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {selectedImages.length > 1 && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-[#000000]/80 rounded text-[10px] font-mono text-[#E6E6E6]">
                          1/{selectedImages.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#878787] space-y-1">
                      <ImageIcon className="w-8 h-8 stroke-[1]" />
                      <span className="text-xs font-mono">Select images above to preview</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Video frame */
                <div className="relative aspect-video w-full bg-[#000000]">
                  {youtubeId ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
              )}

              {/* Content area: Title, Actions & Caption */}
              <div className="p-4 space-y-2.5">
                {postType !== "writing" && (
                  <h3 className="font-heading text-lg text-[#E6E6E6] leading-snug">
                    {title || "Untitled Artwork"}
                  </h3>
                )}

                {caption && (
                  <p className="text-xs text-[#A8A8A8] leading-relaxed line-clamp-2">
                    {caption}
                  </p>
                )}

                {/* Action Row */}
                <div className="pt-2 border-t border-[#303232] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-xs font-mono text-[#E6E6E6]">
                    <span>0 likes</span>
                    <span>•</span>
                    <span>0 comments</span>
                  </div>
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
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] disabled:bg-[#2E3030] disabled:text-[#878787] text-[#E6E6E6] text-xs font-semibold uppercase tracking-wider transition-all duration-200 rounded-xl cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress || "Publishing work..."}</span>
                </>
              ) : (
                <span>Publish Artwork</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
