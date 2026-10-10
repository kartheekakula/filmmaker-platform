"use client";

import React, { useState } from "react";
import type { Profile, ProfileExperience } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { MapPin, Globe, Film, Sparkles, ExternalLink } from "lucide-react";

interface ProfileViewProps {
  profile: Profile;
  experience: ProfileExperience[];
  initialIsFollowing: boolean;
  currentUserId: string | null;
}

export function ProfileView({
  profile,
  experience,
  initialIsFollowing,
  currentUserId,
}: ProfileViewProps) {
  const [followerCount, setFollowerCount] = useState(profile.follower_count ?? 0);

  const handleFollowChange = (isFollowing: boolean) => {
    setFollowerCount((prev) => (isFollowing ? prev + 1 : Math.max(0, prev - 1)));
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Section */}
      <section className="bg-[#232525] border border-[#303232] overflow-hidden rounded-none">
        {/* Banner: Uploaded image or flat #002EC1 block */}
        <div className="w-full h-36 sm:h-44 bg-[#002EC1] relative overflow-hidden">
          {profile.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner_url}
              alt={`${profile.display_name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#002EC1]" />
          )}
        </div>

        {/* Content overlapping banner */}
        <div className="px-5 pb-5">
          {/* Avatar and Action button row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-14 mb-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#002EC1] border-4 border-[#232525] flex items-center justify-center text-3xl font-bold text-[#E6E6E6] rounded-none select-none overflow-hidden shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.display_name?.[0] || profile.username?.[0] || "U").toUpperCase()
              )}
            </div>

            <div className="pt-2">
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={initialIsFollowing}
                currentUserId={currentUserId}
                username={profile.username}
                onFollowChange={handleFollowChange}
              />
            </div>
          </div>

          {/* Name & Headline */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#E6E6E6] tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-xs text-[#878787] font-mono">@{profile.username}</p>
            {profile.headline && (
              <p className="text-sm text-[#E6E6E6] leading-relaxed pt-1">
                {profile.headline}
              </p>
            )}
          </div>

          {/* Location and Languages */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#A8A8A8] pt-2.5">
            {profile.location && (
              <div className="flex items-center space-x-1">
                <MapPin size={13} strokeWidth={1.5} className="text-[#878787]" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.languages && profile.languages.length > 0 && (
              <div className="flex items-center space-x-1">
                <Globe size={13} strokeWidth={1.5} className="text-[#878787]" />
                <span>{profile.languages.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Follower and Following counts */}
          <div className="flex items-center space-x-4 text-xs pt-3 border-t border-[#303232] mt-4">
            <div className="text-[#A8A8A8]">
              <span className="font-semibold text-[#E6E6E6]">{followerCount}</span>{" "}
              {followerCount === 1 ? "follower" : "followers"}
            </div>
            <div className="text-[#A8A8A8]">
              <span className="font-semibold text-[#E6E6E6]">
                {profile.following_count ?? 0}
              </span>{" "}
              following
            </div>
          </div>
        </div>
      </section>

      {/* 2. Fav Dialogue: Quiet pinned quote with 2px left border in #6C86FF */}
      {profile.fav_dialogue && (
        <section className="bg-[#232525] border border-[#303232] p-4 rounded-none">
          <div className="border-l-2 border-[#6C86FF] pl-3.5 space-y-1">
            <p className="text-sm text-[#E6E6E6] font-normal leading-relaxed">
              &ldquo;{profile.fav_dialogue}&rdquo;
            </p>
            {profile.fav_dialogue_source && (
              <p className="text-xs text-[#A8A8A8]">
                — {profile.fav_dialogue_source}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 3. About Section: Bio + Film DNA */}
      <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
          About
        </h2>

        {profile.bio ? (
          <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-line">
            {profile.bio}
          </p>
        ) : (
          <p className="text-xs text-[#878787]">No bio provided yet.</p>
        )}

        {/* Film DNA Chips */}
        {((profile.fav_filmmakers && profile.fav_filmmakers.length > 0) ||
          (profile.fav_genres && profile.fav_genres.length > 0)) && (
          <div className="pt-3 border-t border-[#303232] space-y-3">
            <div className="flex items-center space-x-1.5 text-xs text-[#6C86FF]">
              <Sparkles size={14} strokeWidth={1.5} />
              <span className="font-medium">Film DNA</span>
            </div>

            {profile.fav_filmmakers && profile.fav_filmmakers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-[#878787]">Favourite Filmmakers</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.fav_filmmakers.map((director, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                    >
                      {director}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.fav_genres && profile.fav_genres.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-[#878787]">Favourite Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.fav_genres.map((genre, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Featured Section (empty state for M1) */}
      <section className="bg-[#232525] border border-[#303232] p-5 space-y-3 rounded-none">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
          Featured
        </h2>
        <div className="py-6 text-center border border-dashed border-[#303232]">
          <Film size={20} strokeWidth={1.5} className="mx-auto text-[#878787] mb-2" />
          <p className="text-xs text-[#A8A8A8]">No featured microfilms yet.</p>
          <p className="text-[11px] text-[#878787] mt-0.5">
            Microfilms can be featured in Milestone 2.
          </p>
        </div>
      </section>

      {/* 5. Activity Section (empty state for M1) */}
      <section className="bg-[#232525] border border-[#303232] p-5 space-y-3 rounded-none">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
          Activity
        </h2>
        <div className="py-6 text-center border border-dashed border-[#303232]">
          <p className="text-xs text-[#A8A8A8]">No recent film activity yet.</p>
        </div>
      </section>

      {/* 6. Experience Section */}
      <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
          Experience
        </h2>

        {experience.length > 0 ? (
          <div className="space-y-4 divide-y divide-[#303232]">
            {experience.map((exp) => (
              <div key={exp.id} className="pt-3 first:pt-0 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#E6E6E6]">
                      {exp.title}
                    </h3>
                    <p className="text-xs text-[#A8A8A8]">{exp.org_or_project}</p>
                  </div>
                  <span className="text-[11px] text-[#878787] font-mono">
                    {exp.start_year} — {exp.end_year ?? "Present"}
                  </span>
                </div>

                {exp.description && (
                  <p className="text-xs text-[#A8A8A8] leading-relaxed pt-1">
                    {exp.description}
                  </p>
                )}

                {exp.link && (
                  <a
                    href={exp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-[#6C86FF] hover:underline pt-1"
                  >
                    <span>View project</span>
                    <ExternalLink size={11} strokeWidth={1.5} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#878787]">No creative experience listed yet.</p>
        )}
      </section>

      {/* 7. Skills Section */}
      <section className="bg-[#232525] border border-[#303232] p-5 space-y-3 rounded-none">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
          Skills
        </h2>

        {profile.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill, i) => (
              <span
                key={i}
                className="px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#878787]">No skills added yet.</p>
        )}
      </section>
    </div>
  );
}
