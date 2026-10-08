import { AppLayout } from "@/components/shell/AppLayout";
import { SkeletonFeed } from "@/components/feed/SkeletonCard";
import { CATEGORIES } from "@/lib/constants";

interface ChannelPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params;

  const category = CATEGORIES.find((c) => c.slug === slug);
  const title = category
    ? category.name
    : slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

  return (
    <AppLayout title={title}>
      <section aria-label={`${title} microfilms feed`}>
        <SkeletonFeed />
      </section>
    </AppLayout>
  );
}
