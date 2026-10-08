import { AppLayout } from "@/components/shell/AppLayout";
import { SkeletonFeed } from "@/components/feed/SkeletonCard";

export default function ExplorePage() {
  return (
    <AppLayout title="Explore">
      <section aria-label="Explore microfilms feed">
        <SkeletonFeed />
      </section>
    </AppLayout>
  );
}
