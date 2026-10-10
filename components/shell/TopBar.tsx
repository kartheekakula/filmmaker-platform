"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, User, Settings, LogOut } from "lucide-react";
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
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
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
    <header className="sticky top-0 z-30 h-14 bg-[#232525] border-b border-[#303232] flex items-center justify-between px-4">
      {/* Left: Hamburger button (mobile only) & Brand or Left Spacer */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation drawer"
          className="lg:hidden p-1.5 text-[#E6E6E6] hover:bg-[#2E3030] transition-colors focus:outline-none"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* Title */}
        <h1 className="font-display text-lg tracking-wide text-[#E6E6E6] truncate">
          {title}
        </h1>
      </div>

      {/* Right: Auth Profile Avatar or Sign In button */}
      <div className="flex items-center relative" ref={menuRef}>
        {loading ? (
          <div className="w-8 h-8 bg-[#2E3030] animate-pulse rounded-none" />
        ) : profile ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open profile menu"
              aria-expanded={menuOpen}
              className="relative p-0 border-0 bg-transparent cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 bg-[#002EC1] text-[#E6E6E6] flex items-center justify-center font-semibold text-xs rounded-none select-none hover:bg-[#1F4BE0] transition-colors overflow-hidden">
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
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EFF710] rounded-none ring-1 ring-[#232525]"
                  title="New activity"
                />
              )}
            </button>

            {/* Profile Menu Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-[#232525] border border-[#303232] shadow-none py-1 z-50 rounded-none">
                <div className="px-3 py-2 border-b border-[#303232]">
                  <p className="text-xs font-semibold text-[#E6E6E6] truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-[11px] text-[#878787] truncate">
                    @{profile.username}
                  </p>
                </div>

                <Link
                  href={`/u/${profile.username}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2E3030] transition-colors"
                >
                  <User size={14} strokeWidth={1.5} />
                  <span>View profile</span>
                </Link>

                <Link
                  href="/settings/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2E3030] transition-colors"
                >
                  <Settings size={14} strokeWidth={1.5} />
                  <span>Edit profile</span>
                </Link>

                <div className="border-t border-[#303232] my-1" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center space-x-2 px-3 py-2 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#2E3030] transition-colors"
                >
                  <LogOut size={14} strokeWidth={1.5} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] hover:text-[#6C86FF] border border-[#303232] transition-colors rounded-none"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
