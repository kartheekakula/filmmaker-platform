import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/shell/AppLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin | Arkee",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Admin access is restricted exclusively to the account 'kartheekakula'
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.username?.toLowerCase() !== "kartheekakula") {
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

  return (
    <AppLayout title="Admin" maxWidth="max-w-5xl">
      <AdminDashboard />
    </AppLayout>
  );
}
