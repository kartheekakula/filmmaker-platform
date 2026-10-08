"use client";

import React from "react";
import { Menu } from "lucide-react";

interface TopBarProps {
  title?: string;
  onOpenDrawer: () => void;
}

export function TopBar({ title = "Home", onOpenDrawer }: TopBarProps) {
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

      {/* Right: Square profile avatar placeholder */}
      <div className="flex items-center">
        <div className="relative">
          <div
            title="Profile"
            className="w-8 h-8 bg-[#002EC1] text-[#E6E6E6] flex items-center justify-center font-semibold text-xs rounded-none select-none cursor-pointer hover:bg-[#1F4BE0] active:bg-[#0021A0] transition-colors"
          >
            P
          </div>
          {/* Yellow new-activity dot (only permitted place for #EFF710) */}
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EFF710] rounded-none ring-1 ring-[#232525]"
            title="New activity"
          />
        </div>
      </div>
    </header>
  );
}
