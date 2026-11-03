import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { FestivalForm } from "@/components/admin/FestivalForm";
import { createClient } from "@/lib/supabase/server";
import { getFestivalById } from "@/lib/festivals";

interface AdminEditFestivalPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Edit Festival | Admin",
};

export default async function AdminEditFestivalPage({
  params,
}: AdminEditFestivalPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.username?.toLowerCase() !== "kartheekakulaa") {
    notFound();
  }

  const { data: adminRecord } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    notFound();
  }

  const festival = await getFestivalById(supabase, id, user.id);
  if (!festival) {
    notFound();
  }

  return (
    <AppLayout title="Admin" maxWidth="max-w-4xl">
      <FestivalForm initialData={festival} />
    </AppLayout>
  );
}
