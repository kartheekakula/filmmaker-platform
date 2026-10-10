import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/shell/AppLayout";
import { ProfileView } from "@/components/profile/ProfileView";
import type { Profile, ProfileExperience } from "@/lib/types";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username).toLowerCase();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, headline")
    .eq("username", decoded)
    .single();

  if (!profile) {
    return {
      title: "Profile Not Found | Filmmaker Platform",
    };
  }

  return {
    title: `${profile.display_name || profile.username} (@${profile.username}) | Filmmaker Platform`,
    description: profile.headline || `Filmmaker profile of @${profile.username}`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username).toLowerCase();
  const supabase = await createClient();

  // 1. Fetch Profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (error || !profile) {
    notFound();
  }

  // 2. Fetch Experience
  const { data: experienceData } = await supabase
    .from("profile_experience")
    .select("*")
    .eq("profile_id", profile.id)
    .order("start_year", { ascending: false });

  // 3. Current Authenticated User & Follow Status
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let initialIsFollowing = false;
  if (currentUser && currentUser.id !== profile.id) {
    const { data: followRecord } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .maybeSingle();

    if (followRecord) {
      initialIsFollowing = true;
    }
  }

  return (
    <AppLayout
      title={profile.display_name || profile.username}
      maxWidth="max-w-[760px]"
    >
      <ProfileView
        profile={profile as Profile}
        experience={(experienceData ?? []) as ProfileExperience[]}
        initialIsFollowing={initialIsFollowing}
        currentUserId={currentUser?.id ?? null}
      />
    </AppLayout>
  );
}
