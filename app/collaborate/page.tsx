import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { CollabList } from "@/components/collab/CollabList";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Collaborate | Arkee",
};

export default async function CollaboratePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isRestricted = false;
  if (user) {
    const { data: restricted } = await supabase.rpc("is_restricted", {
      uid: user.id,
    });
    isRestricted = !!restricted;
  }

  return (
    <AppLayout title="Collaborate">
      <CollabList currentUserId={user?.id || null} isRestricted={isRestricted} />
    </AppLayout>
  );
}
