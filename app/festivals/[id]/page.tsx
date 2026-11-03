import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { FestivalDetailView } from "@/components/festivals/FestivalDetailView";
import { createClient } from "@/lib/supabase/server";
import { getFestivalById } from "@/lib/festivals";

interface FestivalPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: FestivalPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const festival = await getFestivalById(supabase, id);

  if (!festival) {
    return { title: "Film Festivals | Arkee" };
  }

  return {
    title: `${festival.name} | Film Festivals`,
  };
}

export default async function FestivalPage({ params }: FestivalPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: adminRes } = await supabase.rpc("is_admin");
    isAdmin = !!adminRes;
  }

  const festival = await getFestivalById(supabase, id, user?.id);

  if (!festival) {
    notFound();
  }

  // Unpublished festivals are visible only to admins
  if (!festival.is_published && !isAdmin) {
    notFound();
  }

  return (
    <AppLayout title="Film Festivals">
      <FestivalDetailView
        festival={festival}
        currentUserId={user?.id || null}
        isAdmin={isAdmin}
      />
    </AppLayout>
  );
}
