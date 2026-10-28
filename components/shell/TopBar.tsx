"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, User, Settings, LogOut, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface TopBarProps {
  title?: string;
  onOpenDrawer: () => void;
  hasNewActivity?: boolean;
}

export function TopBar({
  title = "Home",
  onOpenDrawer,
  hasNewActivity = false,
}: TopBarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load auth state & profile
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile(data as Profile);
        }

        try {
          const { data: adminRecord } = await supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();
          const isKartheek = data?.username?.toLowerCase() === "kartheekakulaa";
          setIsAdmin(!!adminRecord && isKartheek);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
        setIsAdmin(false);
      } else {
        loadProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Close menu on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
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

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#1C1E1E]/95 backdrop-blur border-b border-[#303232] flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger button (mobile only) & Brand or Left Spacer */}
      <div className="flex items-center space-x-3.5">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation drawer"
          className="lg:hidden p-2 text-[#E6E6E6] hover:bg-[#2B2D2D] rounded-xl transition-colors focus:outline-none"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* Brand & Page Title */}
        <div className="flex items-center space-x-2.5">
          <Link
            href="/"
            className="lg:hidden font-logo text-xl tracking-tight text-[#E6E6E6] hover:text-[#6C86FF] transition-colors"
          >
            Arkee
          </Link>
          <span className="lg:hidden text-[#878787]">•</span>
          <h1 className="font-heading text-lg tracking-tight text-[#E6E6E6] truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Auth Profile Avatar or Sign In button */}
      <div className="flex items-center relative" ref={menuRef}>
        {loading ? (
          <div className="w-8 h-8 bg-[#2B2D2D] animate-pulse rounded-full" />
        ) : profile ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
              className="relative p-0 border-0 bg-transparent cursor-pointer focus:outline-none"
            >
              <div className="w-9 h-9 bg-[#002EC1] text-[#E6E6E6] flex items-center justify-center font-semibold text-xs rounded-full ring-2 ring-[#303232] select-none hover:ring-[#6C86FF]/50 transition-all overflow-hidden">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile.display_name?.[0] || profile.username?.[0] || "U").toUpperCase()
                )}
              </div>

              {/* Yellow new-activity dot */}
              {hasNewActivity && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#EFF710] rounded-full ring-2 ring-[#1C1E1E]"
                  title="New activity"
                />
              )}
            </button>

            {/* Profile Menu Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-12 w-52 bg-[#232525] border border-[#303232] shadow-2xl py-1.5 z-50 rounded-2xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-[#303232]">
                  <p className="text-xs font-semibold text-[#E6E6E6] truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-[11px] font-mono text-[#878787] truncate">
                    @{profile.username}
                  </p>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    href={`/u/${profile.username}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2B2D2D] rounded-xl transition-colors"
                  >
                    <User size={15} strokeWidth={1.5} />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2B2D2D] rounded-xl transition-colors"
                  >
                    <Settings size={15} strokeWidth={1.5} />
                    <span>Edit profile</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2B2D2D] rounded-xl transition-colors"
                    >
                      <Shield size={15} strokeWidth={1.5} />
                      <span>Admin</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-[#303232] my-1 mx-2" />

                <div className="p-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left flex items-center space-x-2.5 px-3 py-2 text-xs text-[#A8A8A8] hover:text-red-400 hover:bg-[#2B2D2D] rounded-xl transition-colors"
                  >
                    <LogOut size={15} strokeWidth={1.5} />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] transition-colors rounded-xl shadow-sm"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
