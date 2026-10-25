"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REVIEW_THRESHOLD } from "@/lib/constants";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Ban,
  RotateCcw,
  FileText,
  Loader2,
} from "lucide-react";

interface ReportQueueItem {
  film_id: string;
  title: string;
  post_type: string;
  thumbnail_url: string | null;
  owner_id: string;
  owner_username: string;
  report_count: number;
  reason_counts: Record<string, number>;
  latest_report_at: string;
}

interface HiddenPost {
  id: string;
  title: string;
  post_type: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  media_urls: string[];
  created_at: string;
  profiles: {
    id: string;
    username: string;
  } | null;
}

interface RestrictedUser {
  user_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
  } | null;
}

export function AdminDashboard() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<"reports" | "hidden" | "restricted">("reports");

  // Reports state
  const [reports, setReports] = useState<ReportQueueItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [confirmingRestrictPostId, setConfirmingRestrictPostId] = useState<string | null>(null);

  // Hidden posts state
  const [hiddenPosts, setHiddenPosts] = useState<HiddenPost[]>([]);
  const [loadingHidden, setLoadingHidden] = useState(false);

  // Restricted users state
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUser[]>([]);
  const [loadingRestricted, setLoadingRestricted] = useState(false);

  // Action in progress
  const [actionId, setActionId] = useState<string | null>(null);

  // Load report queue
  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase.rpc("admin_report_queue");
      if (error) {
        console.error("Error loading report queue:", error);
        setReports([]);
      } else {
        setReports((data || []).slice(0, 20));
      }
    } catch (err) {
      console.error("Report queue error:", err);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [supabase]);

  // Load hidden posts
  const loadHidden = useCallback(async () => {
    setLoadingHidden(true);
    try {
      const { data, error } = await supabase
        .from("films")
        .select(`
          id,
          title,
          post_type,
          thumbnail_url,
          youtube_id,
          media_urls,
          created_at,
          profiles:owner_id (
            id,
            username
          )
        `)
        .eq("hidden_reason", "admin")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading hidden posts:", error);
        setHiddenPosts([]);
      } else {
        setHiddenPosts((data || []) as unknown as HiddenPost[]);
      }
    } catch (err) {
      console.error("Hidden posts error:", err);
      setHiddenPosts([]);
    } finally {
      setLoadingHidden(false);
    }
  }, [supabase]);

  // Load restricted users
  const loadRestricted = useCallback(async () => {
    setLoadingRestricted(true);
    try {
      const { data, error } = await supabase
        .from("restrictions")
        .select(`
          user_id,
          created_at,
          profiles:user_id (
            id,
            username,
            display_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading restricted users:", error);
        setRestrictedUsers([]);
      } else {
        setRestrictedUsers((data || []) as unknown as RestrictedUser[]);
      }
    } catch (err) {
      console.error("Restricted users error:", err);
      setRestrictedUsers([]);
    } finally {
      setLoadingRestricted(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (tab === "reports") {
      loadReports();
    } else if (tab === "hidden") {
      loadHidden();
    } else if (tab === "restricted") {
      loadRestricted();
    }
  }, [tab, loadReports, loadHidden, loadRestricted]);

  // Actions for Reports
  const handleHideReportedPost = async (filmId: string) => {
    setActionId(filmId);
    try {
      await supabase.rpc("admin_set_post_hidden", {
        p_film_id: filmId,
        p_hidden: true,
      });
      setReports((prev) => prev.filter((r) => r.film_id !== filmId));
    } catch (err) {
      console.error("Failed to hide post:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleDismissReports = async (filmId: string) => {
    setActionId(filmId);
    try {
      await supabase.rpc("admin_dismiss_reports", {
        p_film_id: filmId,
      });
      setReports((prev) => prev.filter((r) => r.film_id !== filmId));
    } catch (err) {
      console.error("Failed to dismiss reports:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleRestrictOwner = async (filmId: string, ownerId: string) => {
    if (confirmingRestrictPostId !== filmId) {
      setConfirmingRestrictPostId(filmId);
      return;
    }

    setActionId(filmId);
    try {
      await supabase.rpc("admin_set_user_restricted", {
        p_user_id: ownerId,
        p_restricted: true,
      });
      setConfirmingRestrictPostId(null);
      setReports((prev) => prev.filter((r) => r.owner_id !== ownerId));
    } catch (err) {
      console.error("Failed to restrict user:", err);
      setConfirmingRestrictPostId(null);
    } finally {
      setActionId(null);
    }
  };

  // Action for Hidden tab: Show
  const handleShowHiddenPost = async (filmId: string) => {
    setActionId(filmId);
    try {
      await supabase.rpc("admin_set_post_hidden", {
        p_film_id: filmId,
        p_hidden: false,
      });
      setHiddenPosts((prev) => prev.filter((p) => p.id !== filmId));
    } catch (err) {
      console.error("Failed to unhide post:", err);
    } finally {
      setActionId(null);
    }
  };

  // Action for Restricted tab: Lift
  const handleLiftRestriction = async (userId: string) => {
    setActionId(userId);
    try {
      await supabase.rpc("admin_set_user_restricted", {
        p_user_id: userId,
        p_restricted: false,
      });
      setRestrictedUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (err) {
      console.error("Failed to lift restriction:", err);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 3 Plain Tabs */}
      <div className="flex border-b border-[#303232]">
        <button
          type="button"
          onClick={() => {
            setTab("reports");
            setConfirmingRestrictPostId(null);
          }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            tab === "reports"
              ? "border-[#E6E6E6] text-[#E6E6E6]"
              : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
          }`}
        >
          Reports
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("hidden");
            setConfirmingRestrictPostId(null);
          }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            tab === "hidden"
              ? "border-[#E6E6E6] text-[#E6E6E6]"
              : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
          }`}
        >
          Hidden
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("restricted");
            setConfirmingRestrictPostId(null);
          }}
          className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${
            tab === "restricted"
              ? "border-[#E6E6E6] text-[#E6E6E6]"
              : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
          }`}
        >
          Restricted
        </button>
      </div>

      {/* Reports Tab */}
      {tab === "reports" && (
        <div className="pt-2">
          {loadingReports ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-xs text-[#878787] py-16 text-center">No reports</p>
          ) : (
            <div className="space-y-3">
              {reports.map((row) => {
                const needsReview = row.report_count >= REPORT_REVIEW_THRESHOLD;
                const isOperating = actionId === row.film_id;

                return (
                  <div
                    key={row.film_id}
                    className="p-3 bg-[#232525] border border-[#303232] space-y-3"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Thumbnail or text tile */}
                      <div className="w-12 h-12 bg-[#1C1E1E] shrink-0 border border-[#303232] overflow-hidden flex items-center justify-center">
                        {row.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.thumbnail_url}
                            alt={row.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={18} className="text-[#878787]" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-semibold text-[#E6E6E6] truncate">
                            {row.title}
                          </h3>
                          {needsReview && (
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0B1A4A] text-[#6C86FF] border border-[#6C86FF]/30 shrink-0">
                              Review
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-[#878787] font-mono">
                          <Link
                            href={`/u/${row.owner_username}`}
                            className="hover:text-[#6C86FF] transition-colors"
                          >
                            @{row.owner_username}
                          </Link>
                          <span>•</span>
                          <span>
                            {row.report_count}{" "}
                            {row.report_count === 1 ? "report" : "reports"}
                          </span>
                        </div>

                        {/* Reason chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(row.reason_counts || {}).map(
                            ([reason, count]) =>
                              count > 0 && (
                                <span
                                  key={reason}
                                  className="px-2 py-0.5 text-[10px] font-mono bg-[#1C1E1E] border border-[#303232] text-[#A8A8A8]"
                                >
                                  {reason.replace("_", " ")} ({count})
                                </span>
                              )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row Actions: Open, Hide, Dismiss, Restrict */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#303232]">
                      <Link
                        href={`/f/${row.film_id}`}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors"
                      >
                        <ExternalLink size={13} strokeWidth={1.5} />
                        <span>Open</span>
                      </Link>

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleHideReportedPost(row.film_id)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <EyeOff size={13} strokeWidth={1.5} />
                        <span>Hide</span>
                      </button>

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleDismissReports(row.film_id)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check size={13} strokeWidth={1.5} />
                        <span>Dismiss</span>
                      </button>

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleRestrictOwner(row.film_id, row.owner_id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs border transition-colors cursor-pointer disabled:opacity-50 ${
                          confirmingRestrictPostId === row.film_id
                            ? "bg-red-950/40 text-red-400 border-red-500/50"
                            : "bg-[#1C1E1E] hover:bg-[#2E3030] text-[#E6E6E6] border-[#303232]"
                        }`}
                      >
                        <Ban size={13} strokeWidth={1.5} />
                        <span>
                          {confirmingRestrictPostId === row.film_id ? "Sure?" : "Restrict"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hidden Tab */}
      {tab === "hidden" && (
        <div className="pt-2">
          {loadingHidden ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
            </div>
          ) : hiddenPosts.length === 0 ? (
            <p className="text-xs text-[#878787] py-16 text-center">Nothing hidden</p>
          ) : (
            <div className="space-y-3">
              {hiddenPosts.map((film) => {
                const isOperating = actionId === film.id;
                const thumb =
                  film.thumbnail_url ||
                  (film.youtube_id
                    ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`
                    : film.media_urls?.[0] || null);

                return (
                  <div
                    key={film.id}
                    className="p-3 bg-[#232525] border border-[#303232] flex items-center justify-between space-x-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-12 h-12 bg-[#1C1E1E] shrink-0 border border-[#303232] overflow-hidden flex items-center justify-center">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={film.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={18} className="text-[#878787]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#E6E6E6] truncate">
                          {film.title}
                        </h3>
                        {film.profiles?.username && (
                          <p className="text-xs text-[#878787] font-mono truncate">
                            @{film.profiles.username}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleShowHiddenPost(film.id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Eye size={13} strokeWidth={1.5} />
                      <span>Show</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Restricted Tab */}
      {tab === "restricted" && (
        <div className="pt-2">
          {loadingRestricted ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
            </div>
          ) : restrictedUsers.length === 0 ? (
            <p className="text-xs text-[#878787] py-16 text-center">No restrictions</p>
          ) : (
            <div className="space-y-3">
              {restrictedUsers.map((item) => {
                const isOperating = actionId === item.user_id;
                const profile = item.profiles;

                return (
                  <div
                    key={item.user_id}
                    className="p-3 bg-[#232525] border border-[#303232] flex items-center justify-between space-x-3"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#E6E6E6] truncate">
                        {profile?.display_name || profile?.username || item.user_id}
                      </h3>
                      {profile?.username && (
                        <p className="text-xs text-[#878787] font-mono truncate">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleLiftRestriction(item.user_id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RotateCcw size={13} strokeWidth={1.5} />
                      <span>Lift</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
