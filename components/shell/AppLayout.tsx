"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { BottomTabBar } from "./BottomTabBar";
import { SidebarContent } from "./SidebarContent";
import { X } from "lucide-react";

interface AppLayoutProps {
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function AppLayout({
  title = "Home",
  children,
  maxWidth,
}: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-[#000000] text-[#E6E6E6] flex">
      {/* 1. Desktop Persistent Left Sidebar (240px = w-60, visible at lg: >= 1024px) */}
      <aside className="hidden lg:block fixed top-0 left-0 bottom-0 w-60 z-30 border-r border-[#303232] bg-[#232525]">
        <SidebarContent />
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* Backdrop (Close on outside tap) */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-out Drawer Container */}
          <div className="fixed top-0 left-0 bottom-0 w-[260px] bg-[#232525] border-r border-[#303232] flex flex-col z-50">
            {/* Mobile close button header row */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#303232]">
              <span className="font-display text-lg tracking-wider text-[#E6E6E6]">
                FILMMAKER
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-1 text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onItemClick={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Top Bar */}
        <TopBar title={title} onOpenDrawer={() => setDrawerOpen(true)} />

        {/* Centered Feed / Page Content Column */}
        <main className={`flex-1 w-full ${maxWidth ?? "max-w-[680px]"} mx-auto px-4 py-4 pb-20`}>
          {children}
        </main>

        {/* Fixed Bottom Tab Bar */}
        <BottomTabBar />
      </div>
    </div>
  );
}
