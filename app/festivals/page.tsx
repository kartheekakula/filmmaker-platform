import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { FestivalList } from "@/components/festivals/FestivalList";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Film Festivals | Arkee",
};

export default async function FestivalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AppLayout title="Film Festivals">
      <FestivalList currentUserId={user?.id || null} />
    </AppLayout>
  );
}
