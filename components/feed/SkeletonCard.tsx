import React from "react";

export function SkeletonCard() {
  return (
    <article className="w-full bg-[#1C1E1E] border border-[#2B2D2D] rounded-2xl overflow-hidden shadow-sm">
      {/* Creator row */}
      <div className="p-4 flex items-center justify-between border-b border-[#2B2D2D]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 shrink-0 bg-[#2B2D2D] rounded-full animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-[#2B2D2D] rounded-full animate-pulse" />
            <div className="h-2.5 w-16 bg-[#2B2D2D] rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-5 w-16 bg-[#2B2D2D] rounded-full animate-pulse" />
      </div>

      {/* 16:9 aspect ratio video skeleton */}
      <div className="relative aspect-video w-full bg-[#242626] animate-pulse">
        <div className="absolute bottom-3 right-3 h-5 w-12 rounded-full bg-[#1C1E1E]/80" />
      </div>

      {/* Action row skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 rounded-full bg-[#2B2D2D] animate-pulse" />
            <div className="w-6 h-6 rounded-full bg-[#2B2D2D] animate-pulse" />
          </div>
          <div className="h-3 w-14 bg-[#2B2D2D] rounded-full animate-pulse" />
        </div>

        <div className="h-3 w-20 bg-[#2B2D2D] rounded-full animate-pulse" />

        {/* Title skeleton */}
        <div className="space-y-2 pt-1">
          <div className="h-5 w-3/4 bg-[#2B2D2D] rounded-lg animate-pulse" />
          <div className="h-3 w-full bg-[#2B2D2D] rounded-md animate-pulse" />
        </div>
      </div>
    </article>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-5">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
