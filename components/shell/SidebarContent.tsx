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
    <div className="flex flex-col h-full bg-[#232525] select-none">
      {/* Top Brand Title */}
      <div className="h-14 px-4 flex items-center border-b border-[#303232]">
        <Link
          href="/"
          onClick={onItemClick}
          className="font-display text-xl tracking-wider text-[#E6E6E6] hover:text-[#6C86FF] transition-colors"
        >
          FILMMAKER
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-0.5">
          {/* Home */}
          <Link
            href="/"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
              isHomeActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] border-l-[3px] border-[#6C86FF]"
                : "text-[#A8A8A8] hover:bg-[#2E3030] hover:text-[#E6E6E6] border-l-[3px] border-transparent"
            }`}
          >
            <Home size={18} strokeWidth={1.5} />
            <span>Home</span>
          </Link>

          {/* Popular */}
          <Link
            href="/popular"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
              isPopularActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] border-l-[3px] border-[#6C86FF]"
                : "text-[#A8A8A8] hover:bg-[#2E3030] hover:text-[#E6E6E6] border-l-[3px] border-transparent"
            }`}
          >
            <Flame size={18} strokeWidth={1.5} />
            <span>Popular</span>
          </Link>

          {/* Explore */}
          <Link
            href="/explore"
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
              isExploreActive
                ? "bg-[#0B1A4A] text-[#E6E6E6] border-l-[3px] border-[#6C86FF]"
                : "text-[#A8A8A8] hover:bg-[#2E3030] hover:text-[#E6E6E6] border-l-[3px] border-transparent"
            }`}
          >
            <Compass size={18} strokeWidth={1.5} />
            <span>Explore</span>
          </Link>
        </nav>

        {/* Section Divider */}
        <div className="my-3 border-t border-[#303232]" />

        {/* Channels Section */}
        <div className="px-4 py-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#878787]">
            Channels
          </span>
        </div>

        <nav className="space-y-0.5 mt-1">
          {CATEGORIES.map((cat) => {
            const path = `/c/${cat.slug}`;
            const isActive = pathname === path;
            return (
              <Link
                key={cat.slug}
                href={path}
                onClick={onItemClick}
                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-[#0B1A4A] text-[#E6E6E6] border-l-[3px] border-[#6C86FF]"
                    : "text-[#A8A8A8] hover:bg-[#2E3030] hover:text-[#E6E6E6] border-l-[3px] border-transparent"
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
