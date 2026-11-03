import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { CollabDetailView } from "@/components/collab/CollabDetailView";
import { createClient } from "@/lib/supabase/server";
import { getCollabRequestById, getCollabApplicants } from "@/lib/collab";

interface CollabPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: CollabPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const request = await getCollabRequestById(supabase, id);

  if (!request) {
    return { title: "Collaborate | Arkee" };
  }

  return {
    title: `${request.title} | Collaborate`,
  };
}

export default async function CollabPage({ params }: CollabPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let isRestricted = false;

  if (user) {
    const [adminRes, restrictedRes] = await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("is_restricted", { uid: user.id }),
    ]);
    isAdmin = !!adminRes.data;
    isRestricted = !!restrictedRes.data;
  }

  const request = await getCollabRequestById(supabase, id, user?.id);

  if (!request) {
    notFound();
  }

  // If hidden and not owner and not admin, return 404
  if (request.is_hidden && request.owner_id !== user?.id && !isAdmin) {
    notFound();
  }

  let isFollowing = false;
  if (user && user.id !== request.owner_id) {
    const { data: follow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", request.owner_id)
      .maybeSingle();

    isFollowing = !!follow;
  }

  // If owner, fetch applicants
  let applicants: any[] = [];
  if (user && user.id === request.owner_id) {
    applicants = await getCollabApplicants(supabase, id);
  }

  return (
    <AppLayout title="Collaborate">
      <CollabDetailView
        initialRequest={request}
        initialApplicants={applicants}
        currentUserId={user?.id || null}
        initialIsFollowing={isFollowing}
        isAdmin={isAdmin}
        isRestricted={isRestricted}
      />
    </AppLayout>
  );
}

