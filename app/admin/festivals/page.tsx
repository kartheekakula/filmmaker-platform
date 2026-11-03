import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppLayout } from "@/components/shell/AppLayout";
import { AdminFestivalsList } from "@/components/admin/AdminFestivalsList";
import { createClient } from "@/lib/supabase/server";
import { getAllAdminFestivals } from "@/lib/festivals";

export const metadata: Metadata = {
  title: "Manage Festivals | Admin",
};

export default async function AdminFestivalsPage() {
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

  const festivals = await getAllAdminFestivals(supabase);

  return (
    <AppLayout title="Admin" maxWidth="max-w-4xl">
      <AdminFestivalsList initialFestivals={festivals} />
    </AppLayout>
  );
}
