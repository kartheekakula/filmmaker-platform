import { AppLayout } from "@/components/shell/AppLayout";
import { FeedList } from "@/components/feed/FeedList";
import { createClient } from "@/lib/supabase/server";
import { getFilmsFeed, FeedResponse } from "@/lib/films";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let feedData: FeedResponse = {
    films: [],
    nextCursor: null,
    hasMore: false,
  };

  try {
    feedData = await getFilmsFeed(supabase, {
      limit: 10,
      userId: user?.id,
    });
  } catch (err) {
    console.error("Failed to fetch initial home feed:", err);
  }

  return (
    <AppLayout title="Home">
      <section aria-label="Microfilm feed">
        <FeedList
          initialFilms={feedData.films}
          initialCursor={feedData.nextCursor}
          hasMoreInitial={feedData.hasMore}
          feedType="home"
          currentUserId={user?.id}
          emptyTitle="No microfilms published yet"
          emptySubtitle="Be the first creator to share a 1 to 3 minute Telugu microfilm."
        />
      </section>
    </AppLayout>
  );
}
