"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Profile, ProfileExperience, Film } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { MapPin, Globe, Sparkles, ExternalLink, FileText } from "lucide-react";

interface ProfileViewProps {
  profile: Profile;
  experience: ProfileExperience[];
  initialIsFollowing: boolean;
  currentUserId: string | null;
  featuredFilms?: Film[];
  activityFilms?: Film[];
}

export function ProfileView({
  profile,
  experience,
  initialIsFollowing,
  currentUserId,
  featuredFilms = [],
  activityFilms = [],
}: ProfileViewProps) {
  const [followerCount, setFollowerCount] = useState(profile.follower_count ?? 0);

  const handleFollowChange = (isFollowing: boolean) => {
    setFollowerCount((prev) => (isFollowing ? prev + 1 : Math.max(0, prev - 1)));
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Portfolio Card */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] overflow-hidden rounded-2xl shadow-sm">
        {/* Banner: Image or flat deep blue gradient block */}
        <div className="w-full h-36 sm:h-48 bg-[#002EC1] relative overflow-hidden">
          {profile.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.banner_url}
              alt={`${profile.display_name} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#002EC1] to-[#0B1A4A]" />
          )}
        </div>

        {/* Content overlapping banner */}
        <div className="px-5 sm:px-6 pb-6">
          {/* Avatar and Action button row */}
          <div className="relative z-10 flex items-end justify-between -mt-12 sm:-mt-14 mb-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#002EC1] border-4 border-[#1C1E1E] flex items-center justify-center text-3xl font-bold text-[#E6E6E6] rounded-full select-none overflow-hidden shrink-0 shadow-md">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.display_name?.[0] || profile.username?.[0] || "A").toUpperCase()
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
            <h1 className="font-heading text-2xl sm:text-3xl text-[#E6E6E6] tracking-tight">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-xs text-[#878787] font-mono">@{profile.username}</p>
            {profile.headline && (
              <p className="text-sm text-[#E6E6E6] leading-relaxed pt-1.5 font-sans">
                {profile.headline}
              </p>
            )}
          </div>

          {/* Location and Languages */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#A8A8A8] pt-3">
            {profile.location && (
              <div className="flex items-center space-x-1.5">
                <MapPin size={13} strokeWidth={1.5} className="text-[#878787]" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.languages && profile.languages.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <Globe size={13} strokeWidth={1.5} className="text-[#878787]" />
                <span>{profile.languages.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Follower and Following counts */}
          <div className="flex items-center space-x-5 text-xs pt-4 border-t border-[#2B2D2D] mt-4 font-mono">
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

      {/* 2. About / Bio Section */}
      {profile.bio && (
        <section className="bg-[#1C1E1E] border border-[#2B2D2D] p-5 sm:p-6 space-y-3 rounded-2xl shadow-sm">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
            Artist Statement & Vision
          </h2>
          <p className="text-sm text-[#E6E6E6] leading-relaxed whitespace-pre-line font-sans">
            {profile.bio}
          </p>
        </section>
      )}

      {/* 3. Featured Works */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] p-5 sm:p-6 space-y-4 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
            Featured
          </h2>
          {currentUserId === profile.id && (
            <Link
              href="/settings/profile"
              className="text-xs font-mono text-[#6C86FF] hover:underline"
            >
              Edit
            </Link>
          )}
        </div>

        {featuredFilms && featuredFilms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {featuredFilms.map((film) => (
              <Link
                key={film.id}
                href={`/f/${film.id}`}
                className="group block bg-[#242626] border border-[#303232] hover:border-[#6C86FF]/50 transition-all rounded-xl overflow-hidden shadow-sm"
              >
                <div className="relative aspect-video w-full bg-[#000000] overflow-hidden flex items-center justify-center">
                  {film.thumbnail_url || film.youtube_id || (film.media_urls && film.media_urls.length > 0) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        film.thumbnail_url ||
                        (film.youtube_id
                          ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`
                          : film.media_urls?.[0] || "")
                      }
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1A1C1C] p-3 text-center space-y-1">
                      <FileText className="w-5 h-5 text-[#6C86FF]" />
                      <span className="text-[11px] font-mono text-[#A8A8A8] truncate max-w-full px-2">{film.title}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-heading text-sm text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
                    {film.title}
                  </h3>
                  <p className="text-[11px] font-mono text-[#878787] truncate">
                    c/{film.category_slug} • {film.like_count || 0} likes
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-[#303232] rounded-xl space-y-1.5">
            <Sparkles size={22} strokeWidth={1.5} className="mx-auto text-[#878787]" />
            <p className="text-xs text-[#A8A8A8]">No featured works yet.</p>
            {currentUserId === profile.id && (
              <Link
                href="/settings/profile"
                className="inline-block text-xs font-semibold text-[#6C86FF] hover:underline"
              >
                Add works
              </Link>
            )}
          </div>
        )}
      </section>

      {/* 4. Activity Section */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] p-5 sm:p-6 space-y-4 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
            Activity
          </h2>
          <span className="text-[11px] font-mono text-[#878787]">
            Uploads
          </span>
        </div>

        {activityFilms && activityFilms.length > 0 ? (
          <div className="space-y-2.5">
            {activityFilms.map((film) => (
              <Link
                key={film.id}
                href={`/f/${film.id}`}
                className="flex items-center justify-between p-3 bg-[#242626] border border-[#303232] hover:border-[#6C86FF]/50 rounded-xl transition-all group"
              >
                <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                  <div className="w-16 h-10 bg-[#000000] rounded-lg shrink-0 overflow-hidden relative border border-[#303232] flex items-center justify-center">
                    {film.thumbnail_url || film.youtube_id || (film.media_urls && film.media_urls.length > 0) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          film.thumbnail_url ||
                          (film.youtube_id
                            ? `https://img.youtube.com/vi/${film.youtube_id}/hqdefault.jpg`
                            : film.media_urls?.[0] || "")
                        }
                        alt={film.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-[#878787]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm text-[#E6E6E6] group-hover:text-[#6C86FF] transition-colors truncate">
                      {film.title}
                    </h3>
                    <p className="text-[11px] font-mono text-[#878787] truncate">
                      c/{film.category_slug}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#878787] shrink-0 text-right">
                  <div>{film.like_count || 0} likes</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-[#303232] rounded-xl">
            <p className="text-xs text-[#A8A8A8]">No activity yet.</p>
          </div>
        )}
      </section>

      {/* 5. Creative Experience Section */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] p-5 sm:p-6 space-y-4 rounded-2xl shadow-sm">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
          Experience
        </h2>

        {experience.length > 0 ? (
          <div className="space-y-4 divide-y divide-[#2B2D2D]">
            {experience.map((exp) => (
              <div key={exp.id} className="pt-3.5 first:pt-0 space-y-1">
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
                  <p className="text-xs text-[#A8A8A8] leading-relaxed pt-1 font-sans">
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
                    <span>Project</span>
                    <ExternalLink size={11} strokeWidth={1.5} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#878787]">No experience yet.</p>
        )}
      </section>

      {/* 6. Artistic Skills Section */}
      <section className="bg-[#1C1E1E] border border-[#2B2D2D] p-5 sm:p-6 space-y-3 rounded-2xl shadow-sm">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787] font-mono">
          Skills
        </h2>

        {profile.skills && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1 text-xs bg-[#242626] border border-[#303232] text-[#E6E6E6] rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#878787]">No skills yet.</p>
        )}
      </section>
    </div>
  );
}
