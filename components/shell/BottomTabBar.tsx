"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Users, Plus, Cpu } from "lucide-react";

export function BottomTabBar() {
  const pathname = usePathname();

  const isFestivalsActive = pathname === "/festivals";
  const isCollaborateActive = pathname === "/collaborate";
  const isPostActive = pathname === "/post";
  const isAiActive = pathname === "/ai";

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#1C1E1E]/95 backdrop-blur border-t border-[#303232] lg:pl-60"
    >
      <div className="max-w-[680px] h-full mx-auto grid grid-cols-4 items-center px-2">
        {/* Festivals / Showcases */}
        <Link
          href="/festivals"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isFestivalsActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Film size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-1 tracking-tight font-medium">Film Festivals</span>
        </Link>

        {/* Collaborate */}
        <Link
          href="/collaborate"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isCollaborateActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Users size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-1 tracking-tight font-medium">Collaborate</span>
        </Link>

        {/* Post (Filled blue button with rounded-xl shape) */}
        <div className="flex items-center justify-center py-2 px-1">
          <Link
            href="/post"
            className="flex items-center justify-center space-x-1.5 w-full h-10 bg-[#002EC1] text-[#E6E6E6] hover:bg-[#1F4BE0] active:bg-[#0021A0] transition-all rounded-xl shadow-md"
          >
            <Plus size={20} strokeWidth={2} />
            <span className="text-xs tracking-tight font-semibold">Post</span>
          </Link>
        </div>

        {/* AI feedback */}
        <Link
          href="/ai"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isAiActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Cpu size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-1 tracking-tight font-medium">AI Review</span>
        </Link>
      </div>
    </nav>
  );
}
