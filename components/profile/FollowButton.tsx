"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  currentUserId: string | null;
  username: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  currentUserId,
  username,
  onFollowChange,
}: FollowButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // If user is viewing their own profile
  if (currentUserId === targetUserId) {
    return (
      <button
        type="button"
        onClick={() => router.push("/settings/profile")}
        className="px-4 py-1.5 text-xs font-semibold bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232] transition-colors rounded-none"
      >
        Edit profile
      </button>
    );
  }

  const handleToggleFollow = async () => {
    // If not signed in, redirect to login
    if (!currentUserId) {
      router.push(`/login?next=/u/${encodeURIComponent(username)}`);
      return;
    }

    const previousState = isFollowing;
    const nextState = !isFollowing;

    // Optimistic UI update
    setIsFollowing(nextState);
    if (onFollowChange) {
      onFollowChange(nextState);
    }
    setLoading(true);

    try {
      if (nextState) {
        // Follow
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        if (error) throw error;
      } else {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        if (error) throw error;
      }
    } catch (err) {
      // Revert optimistic state on error
      setIsFollowing(previousState);
      if (onFollowChange) {
        onFollowChange(previousState);
      }
      console.error("Follow action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`px-4 py-1.5 text-xs font-semibold transition-colors rounded-none disabled:opacity-50 ${
        isFollowing
          ? "bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232]"
          : "bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6]"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
