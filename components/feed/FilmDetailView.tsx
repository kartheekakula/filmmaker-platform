"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowLeft, Share2, Check, MessageSquare, Trash2, Send, Loader2, Maximize2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FilmWithCreator, Comment } from "@/lib/types";
import {
  toggleFilmLike,
  incrementFilmView,
  getFilmComments,
  addFilmComment,
  deleteFilmComment,
} from "@/lib/films";
import { FollowButton } from "@/components/profile/FollowButton";
import { createClient } from "@/lib/supabase/client";
import { PostMenu } from "./PostMenu";
import { CATEGORIES } from "@/lib/constants";

interface FilmDetailViewProps {
  film: FilmWithCreator;
  currentUserId: string | null;
  initialIsFollowing: boolean;
}

function formatCommentTime(dateString: string): string {
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

  // Editable post state
  const [title, setTitle] = useState(film.title);
  const [caption, setCaption] = useState(film.caption);
  const [body, setBody] = useState(film.body);
  const [categorySlug, setCategorySlug] = useState(film.category_slug);

  // Lightbox state
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const images = (film.media_urls && film.media_urls.length > 0
    ? film.media_urls
    : [film.thumbnail_url]
  ).filter(Boolean) as string[];

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!showLightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLightbox(false);
      } else if (e.key === "ArrowLeft") {
        setActiveLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLightbox, images.length]);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState<number>(film.comment_count || 0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<{ created_at: string; id: string } | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);

  // Check admin role and restricted status
  useEffect(() => {
    if (!currentUserId) return;
    async function checkRole() {
      try {
        const { data: adminData } = await supabase.rpc("is_admin");
        if (adminData) setIsAdmin(true);
        const { data: restrictedData } = await supabase.rpc("is_restricted", {
          uid: currentUserId,
        });
        if (restrictedData) setIsRestricted(true);
      } catch {
        // RPCs might not be available before migration
      }
    }
    checkRole();
  }, [currentUserId, supabase]);

  const postType = film.post_type || "video";

  // Increment view once per session (kept in background, not displayed)
  useEffect(() => {
    const sessionKey = `viewed_film_${film.id}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      incrementFilmView(supabase, film.id);
    }
  }, [film.id, supabase]);

  // Load initial comments
  const loadInitialComments = useCallback(async () => {
    setLoadingComments(true);
    setCommentError(null);
    try {
      const res = await getFilmComments(supabase, film.id, { limit: 15 });
      setComments(res.comments);
      setNextCursor(res.nextCursor);
      setHasMoreComments(res.hasMore);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setCommentError("Could not load comments.");
    } finally {
      setLoadingComments(false);
    }
  }, [supabase, film.id]);

  useEffect(() => {
    loadInitialComments();
  }, [loadInitialComments]);

  const loadMoreComments = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getFilmComments(supabase, film.id, {
        limit: 15,
        cursor: nextCursor,
      });
      setComments((prev) => [...prev, ...res.comments]);
      setNextCursor(res.nextCursor);
      setHasMoreComments(res.hasMore);
    } catch (err) {
      console.error("Failed to load more comments:", err);
    } finally {
      setLoadingMore(false);
    }
  };

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      router.push(`/login?next=/f/${film.id}`);
      return;
    }

    const trimmed = commentInput.trim();
    if (!trimmed || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const newComment = await addFilmComment(supabase, film.id, currentUserId, trimmed);
      setComments((prev) => [newComment, ...prev]);
      setCommentCount((prev) => prev + 1);
      setCommentInput("");
    } catch (err: unknown) {
      console.error("Failed to add comment:", err);
      const msg = err instanceof Error ? err.message : "Failed to post comment.";
      setCommentError(msg);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isAuthor: boolean) => {
    if (!currentUserId || deletingId) return;

    setDeletingId(commentId);
    try {
      if (isAuthor) {
        await deleteFilmComment(supabase, commentId, currentUserId);
      } else if (isAdmin) {
        await supabase.rpc("admin_delete_comment", {
          p_comment_id: commentId,
        });
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const creator = film.profiles;
  const currentCategory = CATEGORIES.find((c) => c.slug === categorySlug);
  const channelName = currentCategory?.name || film.categories?.name || categorySlug;

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

        <div className="flex items-center space-x-2">
          <Link
            href={`/c/${categorySlug}`}
            className="text-xs text-[#6C86FF] hover:underline uppercase tracking-wider font-mono font-medium"
          >
            c/{channelName}
          </Link>
          <PostMenu
            filmId={film.id}
            ownerId={film.owner_id}
            currentUserId={currentUserId}
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
            onDelete={() => {
              router.push("/");
            }}
          />
        </div>
      </div>

      {/* Creator Row (Avatar, Display Name, Date, Follow Button) */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href={`/u/${creator?.username || ""}`}
          className="flex items-center space-x-3 group min-w-0"
        >
          <div className="w-10 h-10 bg-[#002EC1] rounded-full shrink-0 flex items-center justify-center text-[#E6E6E6] font-bold text-sm overflow-hidden ring-2 ring-[#2B2D2D]">
            {creator?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                alt={creator.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(creator?.display_name || creator?.username || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
              {creator?.display_name || creator?.username}
            </p>
            <p className="text-xs font-mono text-[#878787]">
              @{creator?.username} • {formatCommentTime(film.created_at)}
            </p>
          </div>
        </Link>

        {creator && (
          <div>
            <FollowButton
              targetUserId={creator.id}
              initialIsFollowing={initialIsFollowing}
              currentUserId={currentUserId}
              username={creator.username}
            />
          </div>
        )}
      </div>

      {/* Post Title (Always Above the Post Media) */}
      <div className="pt-1">
        <h1 className="font-heading text-2xl sm:text-3xl text-[#E6E6E6] leading-snug">
          {title}
        </h1>
      </div>

      {/* Main Content Area */}
      {postType === "writing" ? (
        <div className="bg-[#1C1E1E] border border-[#303232] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="text-base sm:text-lg text-[#E6E6E6] font-sans leading-relaxed whitespace-pre-wrap select-text">
            {body || caption}
          </div>
        </div>
      ) : postType === "image" ? (
        <div className="space-y-3">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="bg-[#000000] border border-[#303232] rounded-2xl overflow-hidden shadow-xl group cursor-pointer relative"
              onClick={() => {
                setActiveLightboxIndex(idx);
                setShowLightbox(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${title} - ${idx + 1}`}
                className="w-full h-auto max-h-[85vh] object-contain mx-auto group-hover:opacity-95 transition-opacity"
              />
              <div className="absolute top-3 right-3 p-1.5 bg-black/60 text-[#E6E6E6] border border-[#303232] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <Maximize2 size={16} strokeWidth={1.5} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Video Player */
        <div className="relative aspect-video w-full bg-[#000000] border border-[#303232] rounded-2xl overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${film.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Caption (for image and video posts) */}
      {postType !== "writing" && caption && (
        <p className="text-sm sm:text-base text-[#E6E6E6] font-sans leading-relaxed whitespace-pre-wrap pt-1">
          {caption}
        </p>
      )}

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
          <span className="text-xs">{commentCount}</span>
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

      {/* Comments Section */}
      <section id="comments-section" className="pt-6 border-t border-[#303232] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider font-semibold text-[#878787] font-mono">
            Comments ({commentCount})
          </h2>
        </div>

        {/* Comment Input */}
        {currentUserId ? (
          isRestricted ? (
            <div className="p-4 bg-[#1A1C1C] border border-[#303232] rounded-xl text-center text-xs text-[#878787]">
              Account restricted
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="space-y-2">
              <div className="relative">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Write a comment..."
                  className="w-full px-3.5 py-2.5 bg-[#1A1C1C] border border-[#303232] rounded-xl text-[#E6E6E6] placeholder-[#878787] text-sm focus:outline-none focus:border-[#6C86FF] resize-none transition-colors"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-[#878787]">
                    {commentInput.length}/1000
                  </span>
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || submittingComment}
                    className="px-4 py-1.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] disabled:opacity-50 disabled:cursor-not-allowed text-[#E6E6E6] text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Comment</span>
                  </button>
                </div>
              </div>
              {commentError && (
                <p className="text-xs text-red-400 font-mono">{commentError}</p>
              )}
            </form>
          )
        ) : (
          <div className="p-4 bg-[#1A1C1C] border border-[#303232] rounded-xl flex items-center justify-between">
            <p className="text-xs text-[#A8A8A8]">Sign in to comment.</p>
            <Link
              href={`/login?next=/f/${film.id}`}
              className="px-3.5 py-1.5 bg-[#002EC1] hover:bg-[#1F4BE0] text-[#E6E6E6] text-xs font-semibold rounded-lg transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* Comments List */}
        {loadingComments ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-3.5 bg-[#1C1E1E] border border-[#2B2D2D] rounded-xl space-y-2 animate-pulse"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 bg-[#2E3030] rounded-full" />
                  <div className="w-24 h-3 bg-[#2E3030] rounded" />
                </div>
                <div className="w-3/4 h-3 bg-[#2E3030] rounded" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-[#303232] rounded-xl">
            <p className="text-xs text-[#878787]">No comments yet.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {comments.map((comment) => {
              const author = comment.profiles;
              const isAuthor = currentUserId === comment.author_id;
              const canDelete = isAuthor || isAdmin;

              return (
                <div
                  key={comment.id}
                  className="p-3.5 bg-[#1C1E1E] border border-[#2B2D2D] rounded-xl space-y-2 transition-colors hover:border-[#303232]"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/u/${author?.username || ""}`}
                      className="flex items-center space-x-2.5 group min-w-0"
                    >
                      <div className="w-7 h-7 bg-[#002EC1] rounded-full flex items-center justify-center text-[#E6E6E6] text-xs font-bold overflow-hidden shrink-0">
                        {author?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={author.avatar_url}
                            alt={author.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {(author?.display_name || author?.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-semibold text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
                          {author?.display_name || author?.username}
                        </span>
                        <span className="text-[10px] font-mono text-[#878787] ml-1.5">
                          @{author?.username} • {formatCommentTime(comment.created_at)}
                        </span>
                      </div>
                    </Link>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id, isAuthor)}
                        disabled={deletingId === comment.id}
                        className="text-[#878787] hover:text-red-400 p-1 transition-colors cursor-pointer"
                        aria-label="Delete comment"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-wrap break-words pl-9">
                    {comment.body}
                  </p>
                </div>
              );
            })}

            {/* Cursor pagination: Load more */}
            {hasMoreComments && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={loadMoreComments}
                  disabled={loadingMore}
                  className="px-4 py-1.5 bg-[#232525] hover:bg-[#2E3030] border border-[#303232] text-xs font-mono text-[#A8A8A8] hover:text-[#E6E6E6] rounded-lg transition-colors cursor-pointer"
                >
                  {loadingMore ? "Loading..." : "Load more comments"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Full-Screen Image Lightbox Modal */}
      {showLightbox && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="flex items-center justify-between z-10 w-full max-w-6xl mx-auto pb-2 border-b border-[#303232]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h4 className="text-sm font-semibold text-[#E6E6E6] truncate">{title}</h4>
              <p className="text-xs text-[#878787] font-mono">
                Image {activeLightboxIndex + 1} of {images.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="p-1.5 text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#232525] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer"
              aria-label="Close image viewer"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center relative w-full max-w-6xl mx-auto my-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeLightboxIndex]}
              alt={`${title} - full image ${activeLightboxIndex + 1}`}
              className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain select-none"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-[#232525]/90 hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] transition-colors cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-[#232525]/90 hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] transition-colors cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </>
            )}
          </div>

          <div
            className="w-full max-w-6xl mx-auto pt-2 flex items-center justify-between text-xs text-[#878787] font-mono border-t border-[#303232]"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Click backdrop or press Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
