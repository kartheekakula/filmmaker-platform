import React from "react";

export function SkeletonCard() {
  return (
    <article className="w-full bg-[#232525] border border-[#303232] rounded-none overflow-hidden">
      {/* 16:9 aspect ratio video thumbnail skeleton */}
      <div className="relative aspect-video w-full bg-[#2E3030] animate-pulse">
        {/* Duration badge skeleton (bottom-right) */}
        <div className="absolute bottom-2.5 right-2.5 h-4 w-12 bg-[#232525]/80" />
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Creator & Title row */}
        <div className="flex items-start space-x-3">
          {/* Creator square avatar skeleton */}
          <div className="w-8 h-8 shrink-0 bg-[#2E3030] rounded-none animate-pulse" />

          {/* Title & subtitle skeleton lines */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-[#2E3030] rounded-none animate-pulse" />
            <div className="h-3 w-1/2 bg-[#2E3030] rounded-none animate-pulse" />
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-[#303232] pt-3 flex items-center justify-between text-xs text-[#878787]">
          {/* Category tag skeleton */}
          <div className="h-3 w-16 bg-[#2E3030] rounded-none animate-pulse" />

          {/* Stats skeleton (likes, views) */}
          <div className="flex items-center space-x-3">
            <div className="h-3 w-10 bg-[#2E3030] rounded-none animate-pulse" />
            <div className="h-3 w-10 bg-[#2E3030] rounded-none animate-pulse" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function SkeletonFeed() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
