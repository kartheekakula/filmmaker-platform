"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/shell/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { Category, Profile } from "@/lib/types";
import { extractYouTubeId, createFilm, getCategories } from "@/lib/films";
import { resizeImage } from "@/lib/utils/image";
import { Link2, Image as ImageIcon, X, Loader2, Lock } from "lucide-react";

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

  // Composer State
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  // Attachment state (mutually exclusive)
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [durationChecking, setDurationChecking] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [selectedImages, setSelectedImages] = useState<LocalImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check auth and load channels
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
    }

    loadInitialData();
  }, [supabase]);

  // Real-time YouTube validation & duration check
  useEffect(() => {
    if (!videoUrl.trim()) {
      setYoutubeId(null);
      setVideoDuration(null);
      setVideoError(null);
      return;
    }

    const id = extractYouTubeId(videoUrl);
    setYoutubeId(id);

    if (!id) {
      setVideoError("Invalid link");
      setVideoDuration(null);
      return;
    }

    setVideoError(null);
    let isCancelled = false;

    async function checkDuration() {
      setDurationChecking(true);
      try {
        const res = await fetch(`/api/youtube?id=${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (isCancelled) return;

        if (data.duration !== null && data.duration > 180) {
          setVideoError("Video must be 3 minutes or less.");
          setVideoDuration(data.duration);
        } else {
          setVideoDuration(data.duration);
          setVideoError(null);
        }
      } catch {
        if (!isCancelled) {
          setVideoDuration(null);
        }
      } finally {
        if (!isCancelled) {
          setDurationChecking(false);
        }
      }
    }

    checkDuration();

    return () => {
      isCancelled = true;
    };
  }, [videoUrl]);

  // Auto-grow textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const hasMedia = !!youtubeId || selectedImages.length > 0;
    if (hasMedia && val.length > 160) {
      return;
    }
    setText(val);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`;
    }
  };

  // Toggle Link Attachment
  const handleToggleLink = () => {
    if (selectedImages.length > 0) return;
    if (showLinkInput) {
      setShowLinkInput(false);
      setVideoUrl("");
      setYoutubeId(null);
      setVideoError(null);
      setVideoDuration(null);
    } else {
      setShowLinkInput(true);
    }
  };

  // Open Image File Picker
  const handleImageButtonClick = () => {
    if (showLinkInput || videoUrl) return;
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const available = 4 - selectedImages.length;
    if (available <= 0) return;

    const newImages: LocalImage[] = [];
    for (const file of files.slice(0, available)) {
      if (file.type.startsWith("image/")) {
        newImages.push({
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
    }

    setSelectedImages((prev) => [...prev, ...newImages]);
    setShowLinkInput(false);
    setVideoUrl("");
    setYoutubeId(null);
    setVideoError(null);
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

  // Derived post type
  const isVideo = !!youtubeId && !videoError;
  const isImage = selectedImages.length > 0;
  const isWriting = !showLinkInput && !videoUrl && selectedImages.length === 0;

  // Validation
  const isFormValid =
    title.trim().length > 0 &&
    categorySlug.length > 0 &&
    !durationChecking &&
    (isVideo
      ? !videoError
      : isImage
      ? selectedImages.length > 0
      : text.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isVideo) {
        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          caption: text.trim() || null,
          category_slug: categorySlug,
          post_type: "video",
          video_url: videoUrl.trim(),
          youtube_id: youtubeId!,
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          duration_seconds: videoDuration || null,
          preview_start_seconds: 0,
        });
        router.push(`/f/${created.id}`);
      } else if (isImage) {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          const resizedBlob = await resizeImage(img.file, 1600, 1600, 0.88);
          const filePath = `${currentUser.id}/post-${Date.now()}-${i}.webp`;

          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(filePath, resizedBlob, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("post-images").getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }

        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          caption: text.trim() || null,
          category_slug: categorySlug,
          post_type: "image",
          media_urls: uploadedUrls,
          thumbnail_url: uploadedUrls[0],
        });
        router.push(`/f/${created.id}`);
      } else {
        // Writing post
        const created = await createFilm(supabase, currentUser.id, {
          title: title.trim(),
          body: text.trim(),
          category_slug: categorySlug,
          post_type: "writing",
        });
        router.push(`/f/${created.id}`);
      }
    } catch (err: unknown) {
      console.error("Posting failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to post.";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  if (authChecked && !currentUser) {
    return (
      <AppLayout title="Post">
        <div className="bg-[#232525] border border-[#303232] p-8 text-center space-y-4 max-w-sm mx-auto mt-6">
          <div className="w-12 h-12 mx-auto bg-[#2E3030] border border-[#303232] flex items-center justify-center text-[#878787]">
            <Lock className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#E6E6E6]">Sign in</h2>
            <p className="text-xs text-[#878787]">Sign in to post.</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-block px-5 py-2 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const hasMediaAttachment = showLinkInput || selectedImages.length > 0;
  const isNearLimit = hasMediaAttachment && text.length >= 140;

  return (
    <AppLayout title="Post">
      <div className="max-w-[580px] mx-auto py-2 pb-16">
        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMsg && (
            <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
          )}

          {/* Title */}
          <input
            type="text"
            required
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors"
          />

          {/* Text Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={4}
              placeholder="Write something"
              value={text}
              onChange={handleTextChange}
              className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors resize-none leading-relaxed font-sans"
            />
            {isNearLimit && (
              <span className="absolute bottom-2.5 right-3 text-[11px] font-mono text-[#878787]">
                {160 - text.length}
              </span>
            )}
          </div>

          {/* Attach Row */}
          <div className="flex items-center space-x-2 pt-0.5">
            <button
              type="button"
              onClick={handleToggleLink}
              disabled={selectedImages.length > 0}
              aria-label="Link"
              className={`p-2 border transition-colors cursor-pointer ${
                showLinkInput
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#6C86FF]"
                  : selectedImages.length > 0
                  ? "border-transparent text-[#555] cursor-not-allowed opacity-40"
                  : "border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] hover:border-[#6C86FF]/50"
              }`}
            >
              <Link2 size={20} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={handleImageButtonClick}
              disabled={showLinkInput || !!videoUrl}
              aria-label="Image"
              className={`p-2 border transition-colors cursor-pointer ${
                selectedImages.length > 0
                  ? "bg-[#0B1A4A] border-[#6C86FF] text-[#6C86FF]"
                  : showLinkInput || !!videoUrl
                  ? "border-transparent text-[#555] cursor-not-allowed opacity-40"
                  : "border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] hover:border-[#6C86FF]/50"
              }`}
            >
              <ImageIcon size={20} strokeWidth={1.5} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* YouTube Link Input (revealed by link icon) */}
          {showLinkInput && (
            <div className="space-y-1">
              <input
                type="url"
                placeholder="YouTube link"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors"
              />
              {durationChecking && (
                <p className="text-[11px] font-mono text-[#878787]">Checking...</p>
              )}
              {videoError && (
                <p className="text-xs text-red-400 font-mono">{videoError}</p>
              )}
            </div>
          )}

          {/* Image Thumbnails (opened by image icon) */}
          {selectedImages.length > 0 && (
            <div className="flex items-center space-x-2.5 overflow-x-auto py-1">
              {selectedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 overflow-hidden border border-[#303232] bg-[#000000] shrink-0"
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
                    className="absolute top-1 right-1 p-0.5 bg-[#000000]/80 hover:bg-red-600 text-[#E6E6E6] transition-colors cursor-pointer"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Channel Dropdown */}
          <select
            required
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] text-sm focus:outline-none focus:border-[#6C86FF] transition-colors"
          >
            <option value="" disabled>
              Channel
            </option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug} className="bg-[#1A1C1C]">
                {cat.name}
              </option>
            ))}
          </select>

          {/* Post Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full py-3 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] disabled:opacity-40 disabled:cursor-not-allowed text-[#E6E6E6] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Post</span>
            )}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
