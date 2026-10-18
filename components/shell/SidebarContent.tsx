"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { Flame, Compass, Home } from "lucide-react";

interface SidebarContentProps {
  onItemClick?: () => void;
}

export function SidebarContent({ onItemClick }: SidebarContentProps) {
  const pathname = usePathname();

  const isHomeActive = pathname === "/";
  const isPopularActive = pathname === "/popular";
  const isExploreActive = pathname === "/explore";

  return (
    <div className="flex flex-col h-full bg-[#1C1E1E] select-none border-r border-[#303232]">
      {/* Top Brand Title */}
      <div className="h-16 px-5 flex items-center border-b border-[#303232]">
        <Link
          href="/"
          onClick={onItemClick}
          className="font-logo text-2xl tracking-tight text-[#E6E6E6] hover:text-[#6C86FF] transition-colors flex items-center space-x-1.5"
        >
          <span>Arkee</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#6C86FF]" />
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="space-y-1 px-2.5">
          {/* Home */}
          <Link
            href="/"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-3.5 py-2.5 text-sm rounded-xl transition-all ${
              isHomeActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] font-medium shadow-sm"
                : "text-[#A8A8A8] hover:bg-[#2B2D2D] hover:text-[#E6E6E6]"
            }`}
          >
            <Home size={18} strokeWidth={1.5} className={isHomeActive ? "text-[#6C86FF]" : ""} />
            <span>Home</span>
          </Link>

          {/* Popular */}
          <Link
            href="/popular"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-3.5 py-2.5 text-sm rounded-xl transition-all ${
              isPopularActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] font-medium shadow-sm"
                : "text-[#A8A8A8] hover:bg-[#2B2D2D] hover:text-[#E6E6E6]"
            }`}
          >
            <Flame size={18} strokeWidth={1.5} className={isPopularActive ? "text-[#6C86FF]" : ""} />
            <span>Popular</span>
          </Link>

          {/* Explore */}
          <Link
            href="/explore"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-3.5 py-2.5 text-sm rounded-xl transition-all ${
              isExploreActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] font-medium shadow-sm"
                : "text-[#A8A8A8] hover:bg-[#2B2D2D] hover:text-[#E6E6E6]"
            }`}
          >
            <Compass size={18} strokeWidth={1.5} className={isExploreActive ? "text-[#6C86FF]" : ""} />
            <span>Explore</span>
          </Link>
        </nav>

        {/* Section Divider */}
        <div className="my-4 border-t border-[#303232] mx-4" />

        {/* Channels Section */}
        <div className="px-5 py-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#878787] font-mono">
            Crafts & Channels
          </span>
        </div>

        <nav className="space-y-1 mt-1 px-2.5">
          {CATEGORIES.map((cat) => {
            const path = `/c/${cat.slug}`;
            const isActive = pathname === path;
            return (
              <Link
                key={cat.slug}
                href={path}
                onClick={onItemClick}
                className={`flex items-center px-3.5 py-2 text-sm rounded-xl transition-all ${
                  isActive
                    ? "bg-[#0B1A4A] text-[#E6E6E6] font-medium"
                    : "text-[#A8A8A8] hover:bg-[#2B2D2D] hover:text-[#E6E6E6]"
                }`}
              >
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
