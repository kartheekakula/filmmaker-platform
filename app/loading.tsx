import { SkeletonFeed } from "@/components/feed/SkeletonCard";

export default function Loading() {
  return (
    <div className="w-full max-w-[680px] mx-auto py-4">
      <SkeletonFeed />
    </div>
  );
}
