"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REVIEW_THRESHOLD, CATEGORIES } from "@/lib/constants";
import {
  AdminTimeframe,
  PlatformMetrics,
  DetailedReportQueueItem,
  IndividualReport,
  HiddenPostItem,
  RestrictedUserItem,
  getAdminPlatformMetrics,
  getDetailedReportQueue,
  getFilmReports,
} from "@/lib/admin";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Ban,
  RotateCcw,
  FileText,
  Video,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Calendar,
  Layers,
  Filter,
  X,
  ShieldAlert,
  ArrowUpDown,
  Clock,
} from "lucide-react";

export function AdminDashboard() {
  const [supabase] = useState(() => createClient());

  // Metrics state
  const [timeframe, setTimeframe] = useState<AdminTimeframe>("7d");
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"reports" | "hidden" | "restricted">("reports");

  // Reports state
  const [reports, setReports] = useState<DetailedReportQueueItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Filters & sorting for reports
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [postTypeFilter, setPostTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"reports_desc" | "date_desc">("reports_desc");

  // Hidden posts state
  const [hiddenPosts, setHiddenPosts] = useState<HiddenPostItem[]>([]);
  const [loadingHidden, setLoadingHidden] = useState(false);

  // Restricted users state
  const [restrictedUsers, setRestrictedUsers] = useState<RestrictedUserItem[]>([]);
  const [loadingRestricted, setLoadingRestricted] = useState(false);

  // Action states
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionNotification, setActionNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "hide_post" | "restrict_user" | "dismiss_reports";
    targetId: string;
    targetTitle: string;
    extraId?: string; // ownerId for restrict
  } | null>(null);

  // Inspection modal state
  const [inspectItem, setInspectItem] = useState<DetailedReportQueueItem | null>(null);
  const [individualReports, setIndividualReports] = useState<IndividualReport[]>([]);
  const [loadingIndividualReports, setLoadingIndividualReports] = useState(false);

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (actionNotification) {
      const timer = setTimeout(() => setActionNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionNotification]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await getAdminPlatformMetrics(supabase, timeframe);
      setMetrics(data);
    } catch (err: any) {
      console.error("Failed to load metrics:", err);
      setMetricsError("Failed to fetch platform metrics.");
    } finally {
      setLoadingMetrics(false);
    }
  }, [supabase, timeframe]);

  // Load report queue
  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const data = await getDetailedReportQueue(supabase);
      setReports(data);
    } catch (err: any) {
      console.error("Error loading report queue:", err);
      setReportsError("Could not load reports queue.");
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
          caption,
          body,
          category_slug,
          created_at,
          hidden_reason,
          profiles:owner_id (
            id,
            username,
            display_name
          )
        `)
        .eq("is_hidden", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error loading hidden posts:", error);
        setHiddenPosts([]);
      } else {
        const formatted: HiddenPostItem[] = (data || []).map((f: any) => ({
          id: f.id,
          title: f.title,
          post_type: f.post_type || "video",
          thumbnail_url: f.thumbnail_url,
          youtube_id: f.youtube_id,
          media_urls: f.media_urls || [],
          caption: f.caption,
          body: f.body,
          category_slug: f.category_slug,
          created_at: f.created_at,
          hidden_reason: f.hidden_reason,
          owner_id: f.profiles?.id || "",
          owner_username: f.profiles?.username || "unknown",
          owner_display_name: f.profiles?.display_name || null,
        }));
        setHiddenPosts(formatted);
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
          created_by,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error loading restricted users:", error);
        setRestrictedUsers([]);
      } else {
        const formatted: RestrictedUserItem[] = (data || []).map((r: any) => ({
          user_id: r.user_id,
          created_at: r.created_at,
          created_by: r.created_by,
          username: r.profiles?.username || "unknown",
          display_name: r.profiles?.display_name || null,
          avatar_url: r.profiles?.avatar_url || null,
        }));
        setRestrictedUsers(formatted);
      }
    } catch (err) {
      console.error("Restricted users error:", err);
      setRestrictedUsers([]);
    } finally {
      setLoadingRestricted(false);
    }
  }, [supabase]);

  // Initial loads
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (activeTab === "reports") {
      loadReports();
    } else if (activeTab === "hidden") {
      loadHidden();
    } else if (activeTab === "restricted") {
      loadRestricted();
    }
  }, [activeTab, loadReports, loadHidden, loadRestricted]);

  // Load individual reports for inspector
  const openInspector = async (item: DetailedReportQueueItem) => {
    setInspectItem(item);
    setLoadingIndividualReports(true);
    try {
      const reportsList = await getFilmReports(supabase, item.film_id);
      setIndividualReports(reportsList);
    } catch (err) {
      console.error("Error loading individual reports:", err);
      setIndividualReports([]);
    } finally {
      setLoadingIndividualReports(false);
    }
  };

  // Moderation Executions
  const executeHidePost = async (filmId: string) => {
    setActionInProgress(filmId);
    try {
      const { error } = await supabase.rpc("admin_set_post_hidden", {
        p_film_id: filmId,
        p_hidden: true,
      });
      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.film_id !== filmId));
      if (inspectItem?.film_id === filmId) setInspectItem(null);
      setActionNotification({
        type: "success",
        message: "Content hidden from public view.",
      });
      loadMetrics(); // refresh counts
    } catch (err: any) {
      console.error("Failed to hide post:", err);
      setActionNotification({
        type: "error",
        message: err.message || "Failed to hide content.",
      });
    } finally {
      setActionInProgress(null);
      setConfirmModal(null);
    }
  };

  const executeDismissReports = async (filmId: string) => {
    setActionInProgress(filmId);
    try {
      const { error } = await supabase.rpc("admin_dismiss_reports", {
        p_film_id: filmId,
      });
      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.film_id !== filmId));
      if (inspectItem?.film_id === filmId) setInspectItem(null);
      setActionNotification({
        type: "success",
        message: "Reports dismissed.",
      });
      loadMetrics();
    } catch (err: any) {
      console.error("Failed to dismiss reports:", err);
      setActionNotification({
        type: "error",
        message: err.message || "Failed to dismiss reports.",
      });
    } finally {
      setActionInProgress(null);
      setConfirmModal(null);
    }
  };

  const executeRestrictUser = async (userId: string) => {
    setActionInProgress(userId);
    try {
      const { error } = await supabase.rpc("admin_set_user_restricted", {
        p_user_id: userId,
        p_restricted: true,
      });
      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.owner_id !== userId));
      if (inspectItem?.owner_id === userId) setInspectItem(null);
      setActionNotification({
        type: "success",
        message: "Account restricted and works hidden.",
      });
      loadMetrics();
    } catch (err: any) {
      console.error("Failed to restrict user:", err);
      setActionNotification({
        type: "error",
        message: err.message || "Failed to restrict account.",
      });
    } finally {
      setActionInProgress(null);
      setConfirmModal(null);
    }
  };

  const executeRestorePost = async (filmId: string) => {
    setActionInProgress(filmId);
    try {
      const { error } = await supabase.rpc("admin_set_post_hidden", {
        p_film_id: filmId,
        p_hidden: false,
      });
      if (error) throw error;

      setHiddenPosts((prev) => prev.filter((p) => p.id !== filmId));
      setActionNotification({
        type: "success",
        message: "Post restored to public view.",
      });
      loadMetrics();
    } catch (err: any) {
      console.error("Failed to restore post:", err);
      setActionNotification({
        type: "error",
        message: err.message || "Failed to restore post.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const executeLiftRestriction = async (userId: string) => {
    setActionInProgress(userId);
    try {
      const { error } = await supabase.rpc("admin_set_user_restricted", {
        p_user_id: userId,
        p_restricted: false,
      });
      if (error) throw error;

      setRestrictedUsers((prev) => prev.filter((u) => u.user_id !== userId));
      setActionNotification({
        type: "success",
        message: "Restriction lifted and works restored.",
      });
      loadMetrics();
    } catch (err: any) {
      console.error("Failed to lift restriction:", err);
      setActionNotification({
        type: "error",
        message: err.message || "Failed to lift restriction.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Filtered and sorted reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((item) => {
        if (postTypeFilter !== "all" && item.post_type !== postTypeFilter) {
          return false;
        }
        if (reasonFilter !== "all") {
          const count = item.reason_counts[reasonFilter] || 0;
          if (count === 0) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "reports_desc") {
          if (b.report_count !== a.report_count) {
            return b.report_count - a.report_count;
          }
          return new Date(b.latest_report_at).getTime() - new Date(a.latest_report_at).getTime();
        }
        return new Date(b.latest_report_at).getTime() - new Date(a.latest_report_at).getTime();
      });
  }, [reports, postTypeFilter, reasonFilter, sortBy]);

  // Channel helper
  const getCategoryName = (slug: string) => {
    const found = CATEGORIES.find((c) => c.slug === slug);
    return found ? found.name : slug;
  };

  return (
    <div className="space-y-8">
      {/* Action Notification Banner */}
      {actionNotification && (
        <div
          className={`p-3 border flex items-center justify-between text-xs font-mono transition-all ${
            actionNotification.type === "success"
              ? "bg-[#0B1A4A] border-[#6C86FF] text-[#E6E6E6]"
              : "bg-red-950/40 border-red-500/60 text-red-300"
          }`}
        >
          <span>{actionNotification.message}</span>
          <button
            type="button"
            onClick={() => setActionNotification(null)}
            className="p-1 text-[#878787] hover:text-[#E6E6E6]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. PLATFORM ACTIVITY AT A GLANCE                               */}
      {/* ============================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303232] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#E6E6E6] tracking-tight">
              Platform Activity
            </h2>
            <p className="text-xs text-[#878787]">
              Real-time counts and activity metrics across the platform.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Timeframe selector */}
            <div className="flex border border-[#303232] bg-[#1C1E1E]">
              {(["24h", "7d", "30d", "all"] as AdminTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-mono uppercase transition-colors cursor-pointer ${
                    timeframe === tf
                      ? "bg-[#002EC1] text-[#E6E6E6]"
                      : "text-[#878787] hover:text-[#E6E6E6] hover:bg-[#2E3030]"
                  }`}
                >
                  {tf === "all" ? "All" : tf}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={loadMetrics}
              disabled={loadingMetrics}
              title="Refresh metrics"
              className="p-1.5 bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingMetrics ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        {loadingMetrics && !metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-[#232525] border border-[#303232] space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-[#303232]" />
                <div className="h-7 w-24 bg-[#303232]" />
                <div className="h-3 w-20 bg-[#303232]" />
              </div>
            ))}
          </div>
        ) : metricsError ? (
          <div className="p-4 bg-[#232525] border border-red-500/40 text-xs text-red-300">
            {metricsError}
          </div>
        ) : metrics ? (
          <div className="space-y-4">
            {/* 4 Primary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Signups */}
              <div className="p-4 bg-[#232525] border border-[#303232] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#878787]">
                  <span className="font-mono uppercase tracking-wider">Creators</span>
                  <UserCheck size={15} className="text-[#6C86FF]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold font-heading text-[#E6E6E6]">
                    {metrics.totalSignups}
                  </span>
                </div>
                <div className="text-[11px] text-[#A8A8A8] font-mono">
                  {timeframe === "all" ? (
                    "Total registered"
                  ) : (
                    <span>
                      <strong className="text-[#6C86FF]">+{metrics.newSignups}</strong> new in {timeframe}
                    </span>
                  )}
                </div>
              </div>

              {/* Total Posts */}
              <div className="p-4 bg-[#232525] border border-[#303232] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#878787]">
                  <span className="font-mono uppercase tracking-wider">Total Works</span>
                  <Layers size={15} className="text-[#6C86FF]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold font-heading text-[#E6E6E6]">
                    {metrics.totalPosts}
                  </span>
                </div>
                <div className="text-[11px] text-[#A8A8A8] font-mono">
                  {timeframe === "all" ? (
                    "All published works"
                  ) : (
                    <span>
                      <strong className="text-[#6C86FF]">+{metrics.newPosts}</strong> published in {timeframe}
                    </span>
                  )}
                </div>
              </div>

              {/* Videos */}
              <div className="p-4 bg-[#232525] border border-[#303232] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#878787]">
                  <span className="font-mono uppercase tracking-wider">Microfilms</span>
                  <Video size={15} className="text-[#6C86FF]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold font-heading text-[#E6E6E6]">
                    {metrics.totalVideos}
                  </span>
                </div>
                <div className="text-[11px] text-[#A8A8A8] font-mono">
                  {timeframe === "all" ? (
                    "Video post count"
                  ) : (
                    <span>
                      <strong className="text-[#6C86FF]">+{metrics.newVideos}</strong> videos in {timeframe}
                    </span>
                  )}
                </div>
              </div>

              {/* Moderation Counters */}
              <div className="p-4 bg-[#232525] border border-[#303232] flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-[#878787]">
                  <span className="font-mono uppercase tracking-wider">Moderation</span>
                  <ShieldAlert size={15} className="text-[#6C86FF]" />
                </div>
                <div className="my-2 flex items-baseline space-x-2">
                  <span className={`text-2xl font-bold font-heading ${metrics.openReports > 0 ? "text-[#EFF710]" : "text-[#E6E6E6]"}`}>
                    {metrics.openReports}
                  </span>
                  <span className="text-xs text-[#878787] font-mono">open reports</span>
                </div>
                <div className="text-[11px] text-[#878787] font-mono flex items-center space-x-2">
                  <span>{metrics.hiddenPosts} hidden</span>
                  <span>•</span>
                  <span>{metrics.restrictedUsers} restricted</span>
                </div>
              </div>
            </div>

            {/* Breakdowns Row (By Format & By Channel) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Breakdown by Post Type */}
              <div className="p-4 bg-[#232525] border border-[#303232] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E6E6E6]">
                    Works by Format {timeframe !== "all" && `(${timeframe})`}
                  </span>
                  <span className="text-[11px] font-mono text-[#878787]">
                    Total: {metrics.postsByType.video + metrics.postsByType.writing + metrics.postsByType.image}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5 text-[#A8A8A8]">
                      <Video size={13} className="text-[#6C86FF]" />
                      <span>Videos</span>
                    </span>
                    <span className="text-[#E6E6E6] font-semibold">{metrics.postsByType.video}</span>
                  </div>
                  <div className="w-full bg-[#1C1E1E] h-1.5">
                    <div
                      className="bg-[#002EC1] h-1.5"
                      style={{
                        width: `${
                          metrics.newPosts > 0
                            ? (metrics.postsByType.video / (timeframe === "all" ? metrics.totalPosts || 1 : metrics.newPosts || 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center space-x-1.5 text-[#A8A8A8]">
                      <FileText size={13} className="text-[#6C86FF]" />
                      <span>Writing / Scripts</span>
                    </span>
                    <span className="text-[#E6E6E6] font-semibold">{metrics.postsByType.writing}</span>
                  </div>
                  <div className="w-full bg-[#1C1E1E] h-1.5">
                    <div
                      className="bg-[#6C86FF] h-1.5"
                      style={{
                        width: `${
                          metrics.newPosts > 0
                            ? (metrics.postsByType.writing / (timeframe === "all" ? metrics.totalPosts || 1 : metrics.newPosts || 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center space-x-1.5 text-[#A8A8A8]">
                      <ImageIcon size={13} className="text-[#6C86FF]" />
                      <span>Artwork / Design</span>
                    </span>
                    <span className="text-[#E6E6E6] font-semibold">{metrics.postsByType.image}</span>
                  </div>
                  <div className="w-full bg-[#1C1E1E] h-1.5">
                    <div
                      className="bg-[#2E3030] h-1.5"
                      style={{
                        width: `${
                          metrics.newPosts > 0
                            ? (metrics.postsByType.image / (timeframe === "all" ? metrics.totalPosts || 1 : metrics.newPosts || 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Breakdown by Category/Channel */}
              <div className="p-4 bg-[#232525] border border-[#303232] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E6E6E6]">
                    Works by Channel {timeframe !== "all" && `(${timeframe})`}
                  </span>
                  <span className="text-[11px] font-mono text-[#878787]">
                    9 active channels
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-mono">
                  {CATEGORIES.map((cat) => {
                    const count = metrics.postsByChannel[cat.slug] || 0;
                    return (
                      <div
                        key={cat.slug}
                        className="flex items-center justify-between p-1.5 bg-[#1C1E1E] border border-[#303232]"
                      >
                        <span className="text-[#A8A8A8] truncate pr-1 text-[11px]">
                          {cat.name}
                        </span>
                        <span className={`font-semibold ${count > 0 ? "text-[#6C86FF]" : "text-[#878787]"}`}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ============================================================== */}
      {/* 2. MODERATION QUEUE & CONTROLS                                 */}
      {/* ============================================================== */}
      <section className="space-y-4 pt-2">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#303232]">
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center space-x-2 ${
              activeTab === "reports"
                ? "border-[#E6E6E6] text-[#E6E6E6]"
                : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
            }`}
          >
            <span>Moderation Queue</span>
            {reports.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-[#0B1A4A] text-[#6C86FF] border border-[#6C86FF]/30">
                {reports.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hidden")}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center space-x-2 ${
              activeTab === "hidden"
                ? "border-[#E6E6E6] text-[#E6E6E6]"
                : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
            }`}
          >
            <span>Hidden Content</span>
            {hiddenPosts.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-[#1C1E1E] text-[#A8A8A8] border border-[#303232]">
                {hiddenPosts.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restricted")}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center space-x-2 ${
              activeTab === "restricted"
                ? "border-[#E6E6E6] text-[#E6E6E6]"
                : "border-transparent text-[#878787] hover:text-[#A8A8A8]"
            }`}
          >
            <span>Restricted Accounts</span>
            {restrictedUsers.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-[#1C1E1E] text-[#A8A8A8] border border-[#303232]">
                {restrictedUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* ---------------- REPORTS QUEUE TAB ---------------- */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {/* Filter & Sort Bar */}
            <div className="p-3 bg-[#232525] border border-[#303232] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#878787] font-mono flex items-center space-x-1">
                  <Filter size={13} />
                  <span>Filter:</span>
                </span>

                {/* Reason filter */}
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] px-2 py-1 text-xs focus:outline-none focus:border-[#6C86FF]"
                >
                  <option value="all">All Reasons</option>
                  <option value="spam">Spam</option>
                  <option value="abuse">Abuse / Harassment</option>
                  <option value="off_topic">Off-topic</option>
                  <option value="other">Other</option>
                </select>

                {/* Post type filter */}
                <select
                  value={postTypeFilter}
                  onChange={(e) => setPostTypeFilter(e.target.value)}
                  className="bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] px-2 py-1 text-xs focus:outline-none focus:border-[#6C86FF]"
                >
                  <option value="all">All Formats</option>
                  <option value="video">Videos only</option>
                  <option value="writing">Writing only</option>
                  <option value="image">Artwork only</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="flex items-center space-x-2">
                <span className="text-[#878787] font-mono flex items-center space-x-1">
                  <ArrowUpDown size={13} />
                  <span>Sort:</span>
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] px-2 py-1 text-xs focus:outline-none focus:border-[#6C86FF]"
                >
                  <option value="reports_desc">Most Reports</option>
                  <option value="date_desc">Latest Reported</option>
                </select>

                <button
                  type="button"
                  onClick={loadReports}
                  disabled={loadingReports}
                  className="p-1 bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
                  title="Reload queue"
                >
                  <RefreshCw size={13} className={loadingReports ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* List */}
            {loadingReports ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
                <span className="text-xs text-[#878787] font-mono">Loading moderation queue...</span>
              </div>
            ) : reportsError ? (
              <div className="p-4 bg-[#232525] border border-red-500/40 text-xs text-red-300">
                {reportsError}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 bg-[#232525] border border-[#303232] text-center space-y-2">
                <Check size={24} className="mx-auto text-[#6C86FF]" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-[#E6E6E6]">Moderation queue is clear</p>
                <p className="text-xs text-[#878787]">
                  {reports.length > 0
                    ? "No reports match your current filter settings."
                    : "No open reports require action at this time."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((row) => {
                  const needsReview = row.report_count >= REPORT_REVIEW_THRESHOLD;
                  const isOperating = actionInProgress === row.film_id || actionInProgress === row.owner_id;

                  return (
                    <div
                      key={row.film_id}
                      className="p-4 bg-[#232525] border border-[#303232] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Thumbnail / Tile */}
                        <div className="w-16 h-16 bg-[#1C1E1E] shrink-0 border border-[#303232] overflow-hidden flex items-center justify-center relative">
                          {row.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbnail_url}
                              alt={row.title}
                              className="w-full h-full object-cover"
                            />
                          ) : row.post_type === "video" ? (
                            <Video size={20} className="text-[#878787]" />
                          ) : row.post_type === "image" ? (
                            <ImageIcon size={20} className="text-[#878787]" />
                          ) : (
                            <FileText size={20} className="text-[#878787]" />
                          )}
                          <span className="absolute bottom-0 right-0 bg-[#000000] text-[9px] font-mono px-1 text-[#A8A8A8] uppercase">
                            {row.post_type}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#E6E6E6] truncate max-w-md">
                              {row.title}
                            </h3>
                            {needsReview && (
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0B1A4A] text-[#6C86FF] border border-[#6C86FF]/40">
                                Review Required ({row.report_count})
                              </span>
                            )}
                            {row.category_slug && (
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1C1E1E] border border-[#303232] text-[#A8A8A8]">
                                {getCategoryName(row.category_slug)}
                              </span>
                            )}
                          </div>

                          {/* Creator and report time */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#878787] font-mono">
                            <Link
                              href={`/u/${row.owner_username}`}
                              target="_blank"
                              className="text-[#A8A8A8] hover:text-[#6C86FF] transition-colors flex items-center space-x-1"
                            >
                              <span>@{row.owner_username}</span>
                              {row.owner_display_name && (
                                <span className="text-[#878787]">({row.owner_display_name})</span>
                              )}
                            </Link>
                            <span>•</span>
                            <span className="text-[#E6E6E6] font-semibold">
                              {row.report_count} {row.report_count === 1 ? "report" : "reports"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Clock size={11} />
                              <span>
                                Latest: {new Date(row.latest_report_at).toLocaleDateString()}
                              </span>
                            </span>
                          </div>

                          {/* Breakdown chips by reason */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.entries(row.reason_counts || {}).map(([reason, count]) =>
                              Number(count) > 0 ? (
                                <span
                                  key={reason}
                                  className="px-2 py-0.5 text-[10px] font-mono bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6]"
                                >
                                  {reason.replace("_", " ")}: <strong>{count}</strong>
                                </span>
                              ) : null
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#303232]">
                        {/* Inspect / Preview Drawer */}
                        <button
                          type="button"
                          onClick={() => openInspector(row)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer"
                        >
                          <Eye size={13} strokeWidth={1.5} />
                          <span>Inspect & Preview</span>
                        </button>

                        {/* Direct link to public post */}
                        <Link
                          href={`/f/${row.film_id}`}
                          target="_blank"
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors"
                        >
                          <ExternalLink size={13} strokeWidth={1.5} />
                          <span>Open</span>
                        </Link>

                        <div className="h-4 w-px bg-[#303232] mx-1 hidden sm:block" />

                        {/* Hide Post Button (with confirmation) */}
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              type: "hide_post",
                              targetId: row.film_id,
                              targetTitle: row.title,
                            })
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] hover:border-amber-500/50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <EyeOff size={13} strokeWidth={1.5} />
                          <span>Hide Post</span>
                        </button>

                        {/* Dismiss Reports Button */}
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              type: "dismiss_reports",
                              targetId: row.film_id,
                              targetTitle: row.title,
                            })
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] hover:border-[#6C86FF] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check size={13} strokeWidth={1.5} />
                          <span>Dismiss Reports</span>
                        </button>

                        {/* Restrict Creator Button */}
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() =>
                            setConfirmModal({
                              isOpen: true,
                              type: "restrict_user",
                              targetId: row.film_id,
                              extraId: row.owner_id,
                              targetTitle: `@${row.owner_username}`,
                            })
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-red-300 bg-red-950/20 hover:bg-red-950/50 border border-red-500/30 transition-colors cursor-pointer disabled:opacity-50 ml-auto"
                        >
                          <Ban size={13} strokeWidth={1.5} />
                          <span>Restrict Account</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- HIDDEN POSTS TAB ---------------- */}
        {activeTab === "hidden" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#878787] font-mono px-1">
              <span>Showing up to 30 hidden works across the platform</span>
              <button
                type="button"
                onClick={loadHidden}
                disabled={loadingHidden}
                className="hover:text-[#E6E6E6] flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingHidden ? "animate-spin" : ""} />
                <span>Reload</span>
              </button>
            </div>

            {loadingHidden ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
                <span className="text-xs text-[#878787] font-mono">Loading hidden works...</span>
              </div>
            ) : hiddenPosts.length === 0 ? (
              <div className="p-8 bg-[#232525] border border-[#303232] text-center space-y-1">
                <p className="text-sm font-semibold text-[#E6E6E6]">No hidden posts</p>
                <p className="text-xs text-[#878787]">All published posts are currently visible.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hiddenPosts.map((film) => {
                  const isOperating = actionInProgress === film.id;
                  const thumb =
                    film.thumbnail_url ||
                    (film.youtube_id
                      ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`
                      : film.media_urls?.[0] || null);

                  return (
                    <div
                      key={film.id}
                      className="p-3 bg-[#232525] border border-[#303232] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-semibold text-[#E6E6E6] truncate">
                              {film.title}
                            </h3>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#1C1E1E] border border-[#303232] text-[#878787] uppercase">
                              {film.post_type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-[#878787] font-mono">
                            <Link
                              href={`/u/${film.owner_username}`}
                              className="hover:text-[#6C86FF] transition-colors"
                            >
                              @{film.owner_username}
                            </Link>
                            <span>•</span>
                            <span>Reason: {film.hidden_reason || "admin"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <Link
                          href={`/f/${film.id}`}
                          target="_blank"
                          className="px-2.5 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors flex items-center space-x-1"
                        >
                          <ExternalLink size={12} />
                          <span>View</span>
                        </Link>
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => executeRestorePost(film.id)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#002EC1] hover:bg-[#1F4BE0] border border-transparent transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw size={13} strokeWidth={1.5} />
                          <span>Restore</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- RESTRICTED ACCOUNTS TAB ---------------- */}
        {activeTab === "restricted" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#878787] font-mono px-1">
              <span>Restricted creators (read-only mode, works hidden)</span>
              <button
                type="button"
                onClick={loadRestricted}
                disabled={loadingRestricted}
                className="hover:text-[#E6E6E6] flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingRestricted ? "animate-spin" : ""} />
                <span>Reload</span>
              </button>
            </div>

            {loadingRestricted ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#878787]" />
                <span className="text-xs text-[#878787] font-mono">Loading restricted accounts...</span>
              </div>
            ) : restrictedUsers.length === 0 ? (
              <div className="p-8 bg-[#232525] border border-[#303232] text-center space-y-1">
                <p className="text-sm font-semibold text-[#E6E6E6]">No restricted accounts</p>
                <p className="text-xs text-[#878787]">No user accounts are currently under restriction.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restrictedUsers.map((item) => {
                  const isOperating = actionInProgress === item.user_id;

                  return (
                    <div
                      key={item.user_id}
                      className="p-3 bg-[#232525] border border-[#303232] flex items-center justify-between space-x-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 bg-[#002EC1] border border-[#303232] flex items-center justify-center shrink-0 font-bold text-xs">
                          {item.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#E6E6E6] truncate">
                            {item.display_name || item.username}
                          </h3>
                          <div className="flex items-center space-x-2 text-xs text-[#878787] font-mono">
                            <Link
                              href={`/u/${item.username}`}
                              target="_blank"
                              className="hover:text-[#6C86FF] transition-colors"
                            >
                              @{item.username}
                            </Link>
                            <span>•</span>
                            <span>Since: {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => executeLiftRestriction(item.user_id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] hover:border-[#6C86FF] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RotateCcw size={13} strokeWidth={1.5} />
                        <span>Lift Restriction</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. INSPECTION / PREVIEW MODAL                                   */}
      {/* ============================================================== */}
      {inspectItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-[#232525] border border-[#303232] shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#303232] flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs uppercase font-mono px-2 py-0.5 bg-[#000000] border border-[#303232] text-[#6C86FF]">
                    {inspectItem.post_type}
                  </span>
                  <h3 className="text-base font-semibold text-[#E6E6E6] truncate">
                    {inspectItem.title}
                  </h3>
                </div>
                <p className="text-xs text-[#878787] font-mono mt-0.5">
                  By @{inspectItem.owner_username} • {inspectItem.report_count} reports
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="p-1.5 text-[#878787] hover:text-[#E6E6E6] transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {/* Media Preview */}
              <div className="bg-[#1C1E1E] border border-[#303232] p-3 space-y-3">
                <span className="text-[11px] font-mono text-[#878787] uppercase">
                  Content Preview
                </span>

                {inspectItem.post_type === "video" && inspectItem.youtube_id && (
                  <div className="aspect-video w-full bg-black border border-[#303232]">
                    <iframe
                      src={`https://www.youtube.com/embed/${inspectItem.youtube_id}`}
                      title={inspectItem.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {inspectItem.post_type === "image" && inspectItem.media_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {inspectItem.media_urls.map((url, idx) => (
                      <div key={idx} className="aspect-square bg-black border border-[#303232] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Uploaded media" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {inspectItem.caption && (
                  <p className="text-xs text-[#E6E6E6] italic border-l-2 border-[#6C86FF] pl-2">
                    {inspectItem.caption}
                  </p>
                )}

                {inspectItem.body && (
                  <div className="p-3 bg-[#000000] border border-[#303232] text-xs font-serif text-[#E6E6E6] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                    {inspectItem.body}
                  </div>
                )}
              </div>

              {/* Individual Reports Inspection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E6E6E6]">
                    Individual Reports ({individualReports.length})
                  </span>
                  {loadingIndividualReports && (
                    <Loader2 size={13} className="animate-spin text-[#878787]" />
                  )}
                </div>

                {individualReports.length === 0 && !loadingIndividualReports ? (
                  <p className="text-xs text-[#878787] font-mono">No detailed reports found.</p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {individualReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-2.5 bg-[#1C1E1E] border border-[#303232] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-[#6C86FF]">@{report.reporter_username}</span>
                            <span className="px-1.5 py-0.2 text-[9px] bg-[#0B1A4A] border border-[#6C86FF]/30 text-[#E6E6E6] uppercase">
                              {report.reason.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#878787]">
                            Reported on {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#878787] uppercase border border-[#303232] px-1.5 py-0.5">
                          {report.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-[#303232] flex flex-wrap items-center justify-end gap-2 bg-[#1C1E1E]">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-3 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "dismiss_reports",
                    targetId: inspectItem.film_id,
                    targetTitle: inspectItem.title,
                  });
                }}
                className="px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#232525] hover:bg-[#2E3030] border border-[#303232] transition-colors"
              >
                Dismiss Reports
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "hide_post",
                    targetId: inspectItem.film_id,
                    targetTitle: inspectItem.title,
                  });
                }}
                className="px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#002EC1] hover:bg-[#1F4BE0] transition-colors"
              >
                Hide Content
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    type: "restrict_user",
                    targetId: inspectItem.film_id,
                    extraId: inspectItem.owner_id,
                    targetTitle: `@${inspectItem.owner_username}`,
                  });
                }}
                className="px-3 py-1.5 text-xs text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-500/40 transition-colors"
              >
                Restrict User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CONFIRMATION DIALOG MODAL                                    */}
      {/* ============================================================== */}
      {confirmModal && confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85"
        >
          <div className="w-full max-w-md bg-[#232525] border border-[#303232] p-5 space-y-4">
            <div className="flex items-center space-x-2 text-[#E6E6E6]">
              <AlertTriangle
                size={18}
                className={confirmModal.type === "restrict_user" ? "text-red-400" : "text-[#6C86FF]"}
              />
              <h3 className="text-sm font-semibold uppercase tracking-wider">
                {confirmModal.type === "hide_post" && "Confirm Hide Content"}
                {confirmModal.type === "restrict_user" && "Confirm Restrict User"}
                {confirmModal.type === "dismiss_reports" && "Dismiss Open Reports"}
              </h3>
            </div>

            <p className="text-xs text-[#A8A8A8] leading-relaxed">
              {confirmModal.type === "hide_post" && (
                <>
                  Are you sure you want to hide <strong className="text-[#E6E6E6]">&quot;{confirmModal.targetTitle}&quot;</strong>?
                  This removes the work from public feeds and channels, setting its reason to &quot;admin&quot;.
                  All open reports will be marked as actioned.
                </>
              )}
              {confirmModal.type === "restrict_user" && (
                <>
                  Are you sure you want to restrict <strong className="text-[#E6E6E6]">{confirmModal.targetTitle}</strong>?
                  This places the creator in read-only mode, hides all their published films, and prevents them from posting, commenting, or following.
                </>
              )}
              {confirmModal.type === "dismiss_reports" && (
                <>
                  Are you sure you want to dismiss all open reports on <strong className="text-[#E6E6E6]">&quot;{confirmModal.targetTitle}&quot;</strong>?
                  The content will remain publicly visible.
                </>
              )}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#303232]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {confirmModal.type === "hide_post" && (
                <button
                  type="button"
                  onClick={() => executeHidePost(confirmModal.targetId)}
                  className="px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#002EC1] hover:bg-[#1F4BE0] border border-transparent transition-colors cursor-pointer"
                >
                  Confirm & Hide
                </button>
              )}

              {confirmModal.type === "restrict_user" && (
                <button
                  type="button"
                  onClick={() => executeRestrictUser(confirmModal.extraId || confirmModal.targetId)}
                  className="px-3 py-1.5 text-xs text-red-200 bg-red-900 hover:bg-red-800 border border-transparent transition-colors cursor-pointer"
                >
                  Confirm Restriction
                </button>
              )}

              {confirmModal.type === "dismiss_reports" && (
                <button
                  type="button"
                  onClick={() => executeDismissReports(confirmModal.targetId)}
                  className="px-3 py-1.5 text-xs text-[#E6E6E6] bg-[#002EC1] hover:bg-[#1F4BE0] border border-transparent transition-colors cursor-pointer"
                >
                  Dismiss Reports
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
