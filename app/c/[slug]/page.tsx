import { AppLayout } from "@/components/shell/AppLayout";
import { FeedList } from "@/components/feed/FeedList";
import { createClient } from "@/lib/supabase/server";
import { getFilmsFeed, FeedResponse } from "@/lib/films";
import { CATEGORIES } from "@/lib/constants";

interface ChannelPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const category = CATEGORIES.find((c) => c.slug === slug);
  const title = category
    ? category.name
    : slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

  let feedData: FeedResponse = {
    films: [],
    nextCursor: null,
    hasMore: false,
  };

  try {
    feedData = await getFilmsFeed(supabase, {
      limit: 10,
      categorySlug: slug,
      userId: user?.id,
    });
  } catch (err) {
    console.error(`Failed to fetch channel feed for ${slug}:`, err);
  }

  return (
    <AppLayout title={title}>
      <section aria-label={`${title} microfilms feed`}>
        <FeedList
          initialFilms={feedData.films}
          initialCursor={feedData.nextCursor}
          hasMoreInitial={feedData.hasMore}
          feedType="channel"
          categorySlug={slug}
          currentUserId={user?.id}
          emptyTitle={`No microfilms in ${title} yet`}
          emptySubtitle={`Publish your film under the ${title} channel to reach enthusiasts.`}
        />
      </section>
    </AppLayout>
  );
}
