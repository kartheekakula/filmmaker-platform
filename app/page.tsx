import { AppLayout } from "@/components/shell/AppLayout";
import { SkeletonFeed } from "@/components/feed/SkeletonCard";

export default function HomePage() {
  return (
    <AppLayout title="Home">
      <section aria-label="Microfilm feed">
        <SkeletonFeed />
      </section>
    </AppLayout>
  );
}
