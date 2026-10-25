"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Profile, ProfileExperience, Film, ProfileTileFilm } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { MapPin, Globe, ExternalLink, Pin, Play, Layers, FileText, MoreHorizontal, RotateCcw, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FeedCursor, getUserPosts } from "@/lib/films";

interface ProfileViewProps {
  profile: Profile;
  experience: ProfileExperience[];
  initialIsFollowing: boolean;
  currentUserId: string | null;
  currentUserIsAdmin?: boolean;
  isProfileRestricted?: boolean;
  featuredFilms?: Film[];
  initialPosts?: ProfileTileFilm[];
  initialNextCursor?: FeedCursor | null;
  initialHasMore?: boolean;
  postCount?: number;
}

export function ProfileView({
  profile,
  experience,
  initialIsFollowing,
  currentUserId,
  currentUserIsAdmin = false,
  isProfileRestricted = false,
  featuredFilms = [],
  initialPosts = [],
  initialNextCursor = null,
  initialHasMore = false,
  postCount = 0,
}: ProfileViewProps) {
  const [supabase] = useState(() => createClient());
  const [followerCount, setFollowerCount] = useState(profile.follower_count ?? 0);
  const [activeTab, setActiveTab] = useState<"posts" | "about">("posts");

  const [isRestricted, setIsRestricted] = useState(isProfileRestricted);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [confirmRestrictUser, setConfirmRestrictUser] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Sync isProfileRestricted prop
  useEffect(() => {
    setIsRestricted(isProfileRestricted);
  }, [isProfileRestricted]);

  // Click outside admin menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
        setConfirmRestrictUser(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAdminMenuOpen(false);
        setConfirmRestrictUser(false);
      }
    }
    if (adminMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [adminMenuOpen]);

  const handleLiftUserRestriction = async () => {
    try {
      await supabase.rpc("admin_set_user_restricted", {
        p_user_id: profile.id,
        p_restricted: false,
      });
      setIsRestricted(false);
    } catch (err) {
      console.error("Failed to lift restriction:", err);
    } finally {
      setAdminMenuOpen(false);
    }
  };

  const handleRestrictUser = async () => {
    if (!confirmRestrictUser) {
      setConfirmRestrictUser(true);
      return;
    }
    try {
      await supabase.rpc("admin_set_user_restricted", {
        p_user_id: profile.id,
        p_restricted: true,
      });
      setIsRestricted(true);
    } catch (err) {
      console.error("Failed to restrict user:", err);
    } finally {
      setConfirmRestrictUser(false);
      setAdminMenuOpen(false);
    }
  };

  // Posts state
  const [posts, setPosts] = useState<ProfileTileFilm[]>(initialPosts);
  const [cursor, setCursor] = useState<FeedCursor | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleFollowChange = (isFollowing: boolean) => {
    setFollowerCount((prev) => (isFollowing ? prev + 1 : Math.max(0, prev - 1)));
  };

  // Sync state if initial props change
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialNextCursor);
    setHasMore(initialHasMore);
  }, [initialPosts, initialNextCursor, initialHasMore]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || activeTab !== "posts") return;
    const triggerEl = loadMoreRef.current;
    if (!triggerEl) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          try {
            const res = await getUserPosts(supabase, profile.id, {
              limit: 12,
              cursor,
            });
            setPosts((prev) => [...prev, ...res.films]);
            setCursor(res.nextCursor);
            setHasMore(res.hasMore);
          } catch (err) {
            console.error("Failed to load more posts:", err);
          } finally {
            setIsLoadingMore(false);
          }
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, activeTab, cursor, profile.id, supabase]);

  // Filter out featured posts from regular posts to avoid duplicates
  const featuredIds = new Set(featuredFilms.map((f) => f.id));
  const unpinnedPosts = posts.filter((p) => !featuredIds.has(p.id));
  const totalPostsCount = featuredFilms.length + unpinnedPosts.length;

  const renderTile = (film: Film | ProfileTileFilm, isPinned: boolean) => {
    const postType = film.post_type || "video";

    return (
      <Link
        key={film.id}
        href={`/f/${film.id}`}
        className="relative aspect-square bg-[#232525] overflow-hidden group select-none block"
      >
        {/* Top-Right Badges */}
        <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10 flex items-center space-x-1 p-0.5 sm:p-1 bg-black/60 text-[#E6E6E6]">
          {isPinned && <Pin size={13} strokeWidth={1.5} className="text-[#E6E6E6]" />}
          {postType === "video" && (
            <Play size={13} strokeWidth={1.5} className="text-[#E6E6E6] fill-[#E6E6E6]/20" />
          )}
          {postType === "image" && film.media_urls && film.media_urls.length > 1 && (
            <Layers size={13} strokeWidth={1.5} className="text-[#E6E6E6]" />
          )}
          {postType === "writing" && (
            <FileText size={13} strokeWidth={1.5} className="text-[#E6E6E6]" />
          )}
        </div>

        {/* Tile Content */}
        {postType === "video" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              film.thumbnail_url ||
              (film.youtube_id
                ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`
                : "")
            }
            alt={film.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : postType === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={film.media_urls?.[0] || film.thumbnail_url || ""}
            alt={film.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-[#1C1E1E] p-2 sm:p-3 flex flex-col justify-between group-hover:bg-[#242626] transition-colors">
            <span className="font-heading text-xs sm:text-sm text-[#E6E6E6] line-clamp-4 leading-tight">
              {film.title}
            </span>
            <div />
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header (banner & avatar kept exactly as they work now) */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] overflow-hidden rounded-2xl shadow-sm">
        {/* Banner */}
        <div className="w-full h-36 sm:h-48 bg-[#002EC1] relative overflow-hidden">
          {profile.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner_url}
              alt={`${profile.display_name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#002EC1] to-[#0B1A4A]" />
          )}
        </div>

        {/* Content overlapping banner */}
        <div className="px-5 sm:px-6 pb-6">
          {/* Avatar and Action button row */}
          <div className="relative z-10 flex items-end justify-between -mt-12 sm:-mt-14 mb-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#002EC1] border-4 border-[#1C1E1E] flex items-center justify-center text-3xl font-bold text-[#E6E6E6] rounded-full select-none overflow-hidden shrink-0 shadow-md">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.display_name?.[0] || profile.username?.[0] || "A").toUpperCase()
              )}
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={initialIsFollowing}
                currentUserId={currentUserId}
                username={profile.username}
                onFollowChange={handleFollowChange}
              />

              {currentUserIsAdmin && currentUserId !== profile.id && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(!adminMenuOpen);
                      setConfirmRestrictUser(false);
                    }}
                    aria-label="Admin user actions"
                    className="p-2 text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#242626] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer"
                  >
                    <MoreHorizontal size={16} strokeWidth={1.5} />
                  </button>

                  {adminMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-[#232525] border border-[#303232] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                      {isRestricted ? (
                        <button
                          type="button"
                          onClick={handleLiftUserRestriction}
                          className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-[#E6E6E6] hover:bg-[#2E3030] transition-colors cursor-pointer"
                        >
                          <RotateCcw size={14} strokeWidth={1.5} className="text-[#A8A8A8]" />
                          <span>Lift</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRestrictUser}
                          className={`w-full text-left flex items-center space-x-2 px-3 py-2 text-xs transition-colors cursor-pointer ${
                            confirmRestrictUser
                              ? "bg-red-950/40 text-red-400"
                              : "text-[#E6E6E6] hover:bg-[#2E3030]"
                          }`}
                        >
                          <Ban
                            size={14}
                            strokeWidth={1.5}
                            className={confirmRestrictUser ? "text-red-400" : "text-[#A8A8A8]"}
                          />
                          <span>{confirmRestrictUser ? "Sure?" : "Restrict"}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Name & Headline */}
          <div className="space-y-1">
            <h1 className="font-heading text-2xl sm:text-3xl text-[#E6E6E6] tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-xs text-[#878787] font-mono">@{profile.username}</p>
            {profile.headline && (
              <p className="text-sm text-[#E6E6E6] leading-relaxed pt-1.5 font-sans">
                {profile.headline}
              </p>
            )}
          </div>

          {/* Plain Text Bio */}
          {profile.bio && (
            <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-line pt-2 font-sans">
              {profile.bio}
            </p>
          )}

          {/* Location and Languages */}
          {(profile.location || (profile.languages && profile.languages.length > 0)) && (
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#A8A8A8] pt-3">
              {profile.location && (
                <div className="flex items-center space-x-1.5">
                  <MapPin size={13} strokeWidth={1.5} className="text-[#878787]" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.languages && profile.languages.length > 0 && (
                <div className="flex items-center space-x-1.5">
                  <Globe size={13} strokeWidth={1.5} className="text-[#878787]" />
                  <span>{profile.languages.join(", ")}</span>
                </div>
              )}
            </div>
          )}

          {/* Instagram-style Stat Row: posts, followers, following */}
          <div className="flex items-center space-x-8 pt-4 border-t border-[#2B2D2D] mt-4 font-mono">
            <div>
              <div className="font-semibold text-sm text-[#E6E6E6]">{postCount}</div>
              <div className="text-[11px] text-[#A8A8A8] font-sans">posts</div>
            </div>
            <div>
              <div className="font-semibold text-sm text-[#E6E6E6]">{followerCount}</div>
              <div className="text-[11px] text-[#A8A8A8] font-sans">followers</div>
            </div>
            <div>
              <div className="font-semibold text-sm text-[#E6E6E6]">
                {profile.following_count ?? 0}
              </div>
              <div className="text-[11px] text-[#A8A8A8] font-sans">following</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Content: Account Restricted OR Tabs (Posts and About) */}
      {isRestricted ? (
        <div className="py-20 text-center text-sm text-[#878787]">
          Account restricted
        </div>
      ) : (
        <>
          {/* Tabs: Posts and About */}
          <div className="flex border-b border-[#303232] pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === "posts"
                  ? "border-[#E6E6E6] text-[#E6E6E6]"
                  : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
              }`}
            >
              Posts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
                activeTab === "about"
                  ? "border-[#E6E6E6] text-[#E6E6E6]"
                  : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
              }`}
            >
              About
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "posts" ? (
            <div className="pt-1">
              {totalPostsCount === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm text-[#878787]">No posts.</p>
                  {currentUserId === profile.id && (
                    <Link
                      href="/post"
                      className="inline-block px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] transition-colors"
                    >
                      Post
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-[2px]">
                    {featuredFilms.map((film) => renderTile(film, true))}
                    {unpinnedPosts.map((film) => renderTile(film, false))}
                    {isLoadingMore && (
                      <>
                        <div className="aspect-square bg-[#232525] animate-pulse" />
                        <div className="aspect-square bg-[#232525] animate-pulse" />
                        <div className="aspect-square bg-[#232525] animate-pulse" />
                      </>
                    )}
                  </div>
                  <div ref={loadMoreRef} className="h-6" />
                </>
              )}
            </div>
          ) : (
            <div className="pt-2 space-y-6">
              {experience.length === 0 && (!profile.skills || profile.skills.length === 0) ? (
                <p className="text-xs text-[#878787] py-8 text-center">Nothing yet.</p>
              ) : (
                <>
                  {experience.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
                        Experience
                      </h2>
                      <div className="space-y-3 divide-y divide-[#2B2D2D]">
                        {experience.map((exp) => (
                          <div key={exp.id} className="pt-3 first:pt-0 space-y-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-[#E6E6E6]">
                                  {exp.title}
                                </h3>
                                <p className="text-xs text-[#A8A8A8]">{exp.org_or_project}</p>
                              </div>
                              <span className="text-[11px] text-[#878787] font-mono">
                                {exp.start_year} — {exp.end_year ?? "Present"}
                              </span>
                            </div>

                            {exp.description && (
                              <p className="text-xs text-[#A8A8A8] leading-relaxed pt-1 font-sans">
                                {exp.description}
                              </p>
                            )}

                            {exp.link && (
                              <a
                                href={exp.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-xs text-[#6C86FF] hover:underline pt-1"
                              >
                                <span>Project</span>
                                <ExternalLink size={11} strokeWidth={1.5} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.skills && profile.skills.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
                        Skills
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 text-xs bg-[#242626] border border-[#303232] text-[#E6E6E6]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
