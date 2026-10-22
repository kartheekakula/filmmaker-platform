import { AppLayout } from "@/components/shell/AppLayout";
import { FeedList } from "@/components/feed/FeedList";
import { createClient } from "@/lib/supabase/server";
import { getExploreFilms, FeedResponse } from "@/lib/films";

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let exploreData: FeedResponse = {
    films: [],
    nextCursor: null,
    hasMore: false,
  };

  try {
    exploreData = await getExploreFilms(supabase, {
      limit: 10,
      userId: user?.id,
    });
  } catch (err) {
    console.error("Failed to fetch explore films:", err);
  }

  return (
    <AppLayout title="Explore">
      <section aria-label="Explore microfilms feed">
        <FeedList
          initialFilms={exploreData.films}
          initialCursor={exploreData.nextCursor}
          hasMoreInitial={exploreData.hasMore}
          feedType="explore"
          currentUserId={user?.id}
          emptyTitle="All caught up"
          emptySubtitle="No new creators right now."
        />
      </section>
    </AppLayout>
  );
}
