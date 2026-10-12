import { notFound } from "next/navigation";
import { AppLayout } from "@/components/shell/AppLayout";
import { FilmDetailView } from "@/components/feed/FilmDetailView";
import { createClient } from "@/lib/supabase/server";
import { getFilmById } from "@/lib/films";

interface FilmPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FilmPage({ params }: FilmPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const film = await getFilmById(supabase, id, user?.id);
  if (!film) {
    notFound();
  }

  let isFollowing = false;
  if (user && user.id !== film.owner_id) {
    const { data: follow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", film.owner_id)
      .maybeSingle();

    isFollowing = !!follow;
  }

  return (
    <AppLayout title={film.title}>
      <FilmDetailView
        film={film}
        currentUserId={user?.id || null}
        initialIsFollowing={isFollowing}
      />
    </AppLayout>
  );
}
