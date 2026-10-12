import { AppLayout } from "@/components/shell/AppLayout";
import { FeedList } from "@/components/feed/FeedList";
import { createClient } from "@/lib/supabase/server";
import { getPopularFilms } from "@/lib/films";
import { FilmWithCreator } from "@/lib/types";

export default async function PopularPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let popularData: { films: FilmWithCreator[]; hasMore: boolean } = {
    films: [],
    hasMore: false,
  };

  try {
    popularData = await getPopularFilms(supabase, {
      limit: 10,
      offset: 0,
      userId: user?.id,
    });
  } catch (err) {
    console.error("Failed to fetch popular films:", err);
  }

  return (
    <AppLayout title="Popular">
      <section aria-label="Popular microfilms feed">
        <FeedList
          initialFilms={popularData.films}
          hasMoreInitial={popularData.hasMore}
          feedType="popular"
          currentUserId={user?.id}
          emptyTitle="No trending films this week"
          emptySubtitle="Films with the highest likes in the last 7 days appear here."
        />
      </section>
    </AppLayout>
  );
}
