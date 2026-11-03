import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { CollabMineView } from "@/components/collab/CollabMineView";
import { createClient } from "@/lib/supabase/server";
import { getMyPostedCollabs, getMyAppliedCollabs } from "@/lib/collab";

export const metadata: Metadata = {
  title: "My Collaborations | Arkee",
};

export default async function CollabMinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collaborate/mine");
  }

  const [posted, applied] = await Promise.all([
    getMyPostedCollabs(supabase, user.id),
    getMyAppliedCollabs(supabase, user.id),
  ]);

  return (
    <AppLayout title="Collaborate">
      <CollabMineView initialPosted={posted} initialApplied={applied} />
    </AppLayout>
  );
}

