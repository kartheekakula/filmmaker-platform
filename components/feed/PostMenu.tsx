"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Flag, Check, Eye, EyeOff, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PostMenuProps {
  filmId: string;
  ownerId: string;
  currentUserId: string | null;
  initialIsHidden?: boolean;
  className?: string;
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

  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === ownerId;

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

  // Outside click & Escape handlers
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

  // If user is owner and not admin, or restricted and not admin, there are no actions to show
  const canReport = !isOwner && !isRestricted;
  if (!canReport && !isAdmin) {
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

      // Handle duplicate report error (code 23505) quietly as already reported
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

  return (
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
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#232525] border border-[#303232] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {canReport && (
            <>
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

          {/* Quick actions for admins */}
          {isAdmin && (
            <>
              {canReport && <div className="border-t border-[#303232] my-1" />}
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
  );
}
