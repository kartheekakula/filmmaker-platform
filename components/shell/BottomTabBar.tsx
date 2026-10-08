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
      className="fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#232525] border-t border-[#303232] lg:pl-60"
    >
      <div className="max-w-[680px] h-full mx-auto grid grid-cols-4 items-center">
        {/* Festivals */}
        <Link
          href="/festivals"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isFestivalsActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Film size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Festivals</span>
        </Link>

        {/* Collaborate */}
        <Link
          href="/collaborate"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isCollaborateActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Users size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Collaborate</span>
        </Link>

        {/* Post (The ONLY filled blue element in the tab bar) */}
        <Link
          href="/post"
          className="flex flex-col items-center justify-center h-full bg-[#002EC1] text-[#E6E6E6] hover:bg-[#1F4BE0] active:bg-[#0021A0] transition-colors rounded-none"
        >
          <Plus size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Post</span>
        </Link>

        {/* AI feedback */}
        <Link
          href="/ai"
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            isAiActive ? "text-[#E6E6E6]" : "text-[#A8A8A8] hover:text-[#E6E6E6]"
          }`}
        >
          <Cpu size={22} strokeWidth={1.5} />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">AI feedback</span>
        </Link>
      </div>
    </nav>
  );
}
