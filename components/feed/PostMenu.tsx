"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Flag,
  Check,
  Eye,
  EyeOff,
  Ban,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants";
import { updateFilm, deleteFilm } from "@/lib/films";

interface PostMenuProps {
  filmId: string;
  ownerId: string;
  currentUserId: string | null;
  initialIsHidden?: boolean;
  className?: string;
  postType?: "video" | "writing" | "image";
  initialTitle?: string;
  initialCaption?: string | null;
  initialBody?: string | null;
  initialCategorySlug?: string;
  onUpdate?: (updated: {
    title: string;
    caption: string | null;
    body: string | null;
    category_slug: string;
  }) => void;
  onDelete?: (filmId: string) => void;
}

const REPORT_REASONS = [
  { label: "Spam", value: "spam" },
  { label: "Off topic", value: "off_topic" },
  { label: "Abuse", value: "abuse" },
  { label: "Other", value: "other" },
] as const;

export function PostMenu({
  filmId,
  ownerId,
  currentUserId,
  initialIsHidden = false,
  className = "",
  postType = "video",
  initialTitle = "",
  initialCaption = null,
  initialBody = null,
  initialCategorySlug = "",
  onUpdate,
  onDelete,
}: PostMenuProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [menuOpen, setMenuOpen] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHidden, setIsHidden] = useState(initialIsHidden);
  const [confirmRestrict, setConfirmRestrict] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editCaption, setEditCaption] = useState(initialCaption || "");
  const [editBody, setEditBody] = useState(initialBody || "");
  const [editCategory, setEditCategory] = useState(initialCategorySlug);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === ownerId;

  // Sync edit fields when props update
  useEffect(() => {
    setEditTitle(initialTitle);
    setEditCaption(initialCaption || "");
    setEditBody(initialBody || "");
    setEditCategory(initialCategorySlug);
  }, [initialTitle, initialCaption, initialBody, initialCategorySlug]);

  // Check user status: report existence, restricted status, and admin status
  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;

    async function checkStatus() {
      try {
        // 1. Check if already reported
        const { data: reportData } = await supabase
          .from("reports")
          .select("id")
          .eq("film_id", filmId)
          .eq("reporter_id", currentUserId)
          .maybeSingle();

        if (isMounted && reportData) {
          setIsReported(true);
        }

        // 2. Check if current user is restricted
        const { data: restrictedData } = await supabase.rpc("is_restricted", {
          uid: currentUserId,
        });
        if (isMounted && restrictedData) {
          setIsRestricted(true);
        }

        // 3. Check if current user is an admin
        const { data: adminData } = await supabase.rpc("is_admin");
        if (isMounted && adminData) {
          setIsAdmin(true);
        }
      } catch {
        // Migration might not yet be applied or RPC unavailable
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, filmId, supabase]);

  // Outside click & Escape handlers for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowReasons(false);
        setConfirmRestrict(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setShowReasons(false);
        setConfirmRestrict(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  // If user cannot do anything, render nothing
  const canReport = !isOwner && !isRestricted;
  if (!isOwner && !canReport && !isAdmin) {
    return null;
  }

  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    if (isReported) return;
    setShowReasons(true);
  };

  const handleSelectReason = async (e: React.MouseEvent, reason: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUserId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        film_id: filmId,
        reporter_id: currentUserId,
        reason,
      });

      if (error && error.code !== "23505") {
        console.error("Report submit error:", error);
      }

      setIsReported(true);
      setShowReasons(false);
    } catch (err) {
      console.error("Failed to report post:", err);
      setIsReported(true);
      setShowReasons(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextHidden = !isHidden;
    setIsHidden(nextHidden);
    try {
      await supabase.rpc("admin_set_post_hidden", {
        p_film_id: filmId,
        p_hidden: nextHidden,
      });
    } catch (err) {
      console.error("Failed to toggle post visibility:", err);
      setIsHidden(!nextHidden);
    }
    setMenuOpen(false);
  };

  const handleToggleRestrict = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmRestrict) {
      setConfirmRestrict(true);
      return;
    }

    try {
      await supabase.rpc("admin_set_user_restricted", {
        p_user_id: ownerId,
        p_restricted: true,
      });
    } catch (err) {
      console.error("Failed to restrict user:", err);
    } finally {
      setConfirmRestrict(false);
      setMenuOpen(false);
    }
  };

  // Handle Edit Post submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !isOwner) return;

    if (!editTitle.trim()) {
      setEditError("Title is required.");
      return;
    }
    if (!editCategory) {
      setEditError("Channel is required.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      await updateFilm(supabase, filmId, currentUserId, {
        title: editTitle.trim(),
        caption: editCaption.trim() || null,
        body: postType === "writing" ? editBody.trim() || null : null,
        category_slug: editCategory,
      });

      if (onUpdate) {
        onUpdate({
          title: editTitle.trim(),
          caption: editCaption.trim() || null,
          body: postType === "writing" ? editBody.trim() || null : null,
          category_slug: editCategory,
        });
      }

      setIsEditOpen(false);
    } catch (err: any) {
      console.error("Failed to update post:", err);
      setEditError(err.message || "Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Post submission
  const handleConfirmDelete = async () => {
    if (!currentUserId || !isOwner) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteFilm(supabase, filmId, currentUserId);
      setIsDeleteOpen(false);
      if (onDelete) {
        onDelete(filmId);
      }
    } catch (err: any) {
      console.error("Failed to delete post:", err);
      setDeleteError(err.message || "Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className={`relative ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            setShowReasons(false);
            setConfirmRestrict(false);
          }}
          aria-label="Post actions"
          className="p-1 text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2E3030] transition-colors focus:outline-none cursor-pointer"
        >
          <MoreHorizontal size={18} strokeWidth={1.5} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-[#232525] border border-[#303232] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* Owner Actions: Edit & Delete */}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setEditError(null);
                    setIsEditOpen(true);
                  }}
                  className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-[#E6E6E6] hover:bg-[#2E3030] transition-colors cursor-pointer"
                >
                  <Pencil size={14} strokeWidth={1.5} className="text-[#A8A8A8]" />
                  <span>Edit post</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteError(null);
                    setIsDeleteOpen(true);
                  }}
                  className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 hover:bg-[#2E3030] transition-colors cursor-pointer"
                >
                  <Trash2 size={14} strokeWidth={1.5} className="text-red-400" />
                  <span>Delete post</span>
                </button>
              </>
            )}

            {/* Non-owner: Report */}
            {canReport && (
              <>
                {isOwner && <div className="border-t border-[#303232] my-1" />}
                {isReported ? (
                  <div className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#878787] cursor-default">
                    <Check size={14} strokeWidth={1.5} className="text-[#878787]" />
                    <span>Reported</span>
                  </div>
                ) : showReasons ? (
                  <div className="space-y-0.5">
                    <div className="px-3 py-1 text-[10px] font-mono uppercase text-[#878787]">
                      Report reason
                    </div>
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={(e) => handleSelectReason(e, r.value)}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#E6E6E6] hover:bg-[#2E3030] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleReportClick}
                    className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-[#E6E6E6] hover:bg-[#2E3030] transition-colors cursor-pointer"
                  >
                    <Flag size={14} strokeWidth={1.5} className="text-[#A8A8A8]" />
                    <span>Report</span>
                  </button>
                )}
              </>
            )}

            {/* Admin Quick Actions */}
            {isAdmin && (
              <>
                {(isOwner || canReport) && <div className="border-t border-[#303232] my-1" />}
                <button
                  type="button"
                  onClick={handleToggleHide}
                  className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-[#E6E6E6] hover:bg-[#2E3030] transition-colors cursor-pointer"
                >
                  {isHidden ? (
                    <>
                      <Eye size={14} strokeWidth={1.5} className="text-[#A8A8A8]" />
                      <span>Show</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} strokeWidth={1.5} className="text-[#A8A8A8]" />
                      <span>Hide</span>
                    </>
                  )}
                </button>

                {!isOwner && (
                  <button
                    type="button"
                    onClick={handleToggleRestrict}
                    className={`w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs transition-colors cursor-pointer ${
                      confirmRestrict
                        ? "bg-red-950/40 text-red-400"
                        : "text-[#E6E6E6] hover:bg-[#2E3030]"
                    }`}
                  >
                    <Ban
                      size={14}
                      strokeWidth={1.5}
                      className={confirmRestrict ? "text-red-400" : "text-[#A8A8A8]"}
                    />
                    <span>{confirmRestrict ? "Sure?" : "Restrict"}</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Post Modal */}
      {isEditOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#232525] border border-[#303232] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#303232] pb-3">
              <h3 className="font-heading text-lg text-[#E6E6E6]">Edit Post</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
                aria-label="Close edit"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-xs text-red-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[#A8A8A8]">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
                  placeholder="Post title"
                />
              </div>

              {/* Channel */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-[#A8A8A8]">
                  Channel *
                </label>
                <select
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none"
                >
                  <option value="" disabled>
                    Select channel
                  </option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <label className="uppercase text-[#A8A8A8]">Caption</label>
                  <span className="text-[#878787]">{editCaption.length}/160</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none resize-none"
                  placeholder="Optional short caption..."
                />
              </div>

              {/* Body (for writing posts) */}
              {postType === "writing" && (
                <div className="space-y-1">
                  <label className="block text-xs font-mono uppercase text-[#A8A8A8]">
                    Story / Screenplay Text
                  </label>
                  <textarea
                    rows={6}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] focus:border-[#6C86FF] focus:outline-none leading-relaxed"
                    placeholder="Body content..."
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#303232]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs font-semibold bg-[#2E3030] hover:bg-[#353838] text-[#E6E6E6] border border-[#303232] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSavingEdit && <Loader2 size={13} className="animate-spin" />}
                  <span>{isSavingEdit ? "Saving..." : "Save changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setIsDeleteOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-[#232525] border border-[#303232] p-5 sm:p-6 space-y-4">
            <div className="flex items-center space-x-2.5 text-red-400">
              <AlertTriangle size={18} />
              <h3 className="font-heading text-lg text-[#E6E6E6]">Delete Post</h3>
            </div>

            <p className="text-xs text-[#A8A8A8] leading-relaxed">
              Are you sure you want to delete this post? This action is permanent and cannot be
              undone.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 text-xs text-red-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#303232]">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-[#2E3030] hover:bg-[#353838] text-[#E6E6E6] border border-[#303232] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-red-900 hover:bg-red-800 text-red-100 transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Delete post"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
