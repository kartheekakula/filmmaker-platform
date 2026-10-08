import { AppLayout } from "@/components/shell/AppLayout";
import { SkeletonFeed } from "@/components/feed/SkeletonCard";

export default function PopularPage() {
  return (
    <AppLayout title="Popular">
      <section aria-label="Popular microfilms feed">
        <SkeletonFeed />
      </section>
    </AppLayout>
  );
}
