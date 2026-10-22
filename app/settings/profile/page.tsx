"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/utils/image";
import { AppLayout } from "@/components/shell/AppLayout";
import type { Profile, ProfileExperience, Film } from "@/lib/types";
import {
  getUserFilms,
  getFeaturedFilms,
  updateFeaturedFilms,
} from "@/lib/films";
import {
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  X,
  ExternalLink,
  Film as FilmIcon,
  FileText,
} from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<ProfileExperience[]>([]);
  const [userFilms, setUserFilms] = useState<Film[]>([]);
  const [featuredFilmIds, setFeaturedFilmIds] = useState<string[]>([]);

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Media
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Experience modal/form
  const [isAddingExp, setIsAddingExp] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expOrg, setExpOrg] = useState("");
  const [expStartYear, setExpStartYear] = useState<number>(new Date().getFullYear());
  const [expEndYear, setExpEndYear] = useState<string>("");
  const [expDescription, setExpDescription] = useState("");
  const [expLink, setExpLink] = useState("");

  // 1. Load initial data
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/settings/profile");
        return;
      }

      setUserId(user.id);

      // Fetch profile
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (p) {
        setProfile(p as Profile);
        setDisplayName(p.display_name || "");
        setHeadline(p.headline || "");
        setBio(p.bio || "");
        setLocation(p.location || "");
        setLanguages(p.languages || []);
        setSkills(p.skills || []);
        setAvatarUrl(p.avatar_url || null);
        setBannerUrl(p.banner_url || null);
      }

      // Fetch experiences
      const { data: exp } = await supabase
        .from("profile_experience")
        .select("*")
        .eq("profile_id", user.id)
        .order("start_year", { ascending: false });

      if (exp) {
        setExperiences(exp as ProfileExperience[]);
      }

      // Fetch user films and featured films
      const films = await getUserFilms(supabase, user.id, 50);
      setUserFilms(films);

      const featured = await getFeaturedFilms(supabase, user.id);
      setFeaturedFilmIds(featured.map((f) => f.film_id));

      setLoading(false);
    }

    loadData();
  }, [router, supabase]);

  // 2. Upload Avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Avatar image must be under 2 MB.");
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage("");

    try {
      const resizedBlob = await resizeImage(file, 500, 500, 0.9);
      const filePath = `${userId}/avatar-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resizedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload avatar"
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 3. Upload Banner
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage("Banner image must be under 4 MB.");
      return;
    }

    setUploadingBanner(true);
    setErrorMessage("");

    try {
      const resizedBlob = await resizeImage(file, 1600, 500, 0.9);
      const filePath = `${userId}/banner-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(filePath, resizedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("banners").getPublicUrl(filePath);

      setBannerUrl(publicUrl);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload banner"
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  // 4. Save Main Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName.trim(),
        headline: headline.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        languages,
        fav_dialogue: null,
        fav_dialogue_source: null,
        fav_filmmakers: [],
        fav_genres: [],
        skills,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }).eq("id", userId);

      if (error) throw error;

      // Update featured films
      await updateFeaturedFilms(supabase, userId, featuredFilmIds);

      setSuccessMessage("Profile saved successfully.");
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // 5. Experience Operations
  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      const payload = {
        profile_id: userId,
        title: expTitle.trim(),
        org_or_project: expOrg.trim(),
        start_year: Number(expStartYear),
        end_year: expEndYear ? Number(expEndYear) : null,
        description: expDescription.trim() || null,
        link: expLink.trim() || null,
      };

      if (editingExpId) {
        const { error } = await supabase
          .from("profile_experience")
          .update(payload)
          .eq("id", editingExpId)
          .eq("profile_id", userId);
        if (error) throw error;
        setExperiences(
          experiences.map((item) =>
            item.id === editingExpId ? { ...item, ...payload } : item
          )
        );
      } else {
        const { data, error } = await supabase
          .from("profile_experience")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) setExperiences([data as ProfileExperience, ...experiences]);
      }

      // Reset form
      setIsAddingExp(false);
      setEditingExpId(null);
      setExpTitle("");
      setExpOrg("");
      setExpStartYear(new Date().getFullYear());
      setExpEndYear("");
      setExpDescription("");
      setExpLink("");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save experience entry"
      );
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("profile_experience")
        .delete()
        .eq("id", id)
        .eq("profile_id", userId);
      if (error) throw error;
      setExperiences(experiences.filter((e) => e.id !== id));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete experience"
      );
    }
  };

  const handleEditExperienceClick = (exp: ProfileExperience) => {
    setEditingExpId(exp.id);
    setExpTitle(exp.title);
    setExpOrg(exp.org_or_project);
    setExpStartYear(exp.start_year);
    setExpEndYear(exp.end_year ? String(exp.end_year) : "");
    setExpDescription(exp.description || "");
    setExpLink(exp.link || "");
    setIsAddingExp(true);
  };

  const moveExperience = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= experiences.length) return;
    const next = [...experiences];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setExperiences(next);
  };

  if (loading) {
    return (
      <AppLayout title="Edit Profile">
        <div className="py-20 text-center text-xs text-[#878787]">
          Loading profile settings...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Profile" maxWidth="max-w-[760px]">
      <div className="space-y-6 pb-12">
        {/* Top Back Link & Action Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={profile ? `/u/${profile.username}` : "/"}
            className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span>Back to profile</span>
          </Link>
          {profile && (
            <Link
              href={`/u/${profile.username}`}
              className="text-xs text-[#6C86FF] hover:underline"
            >
              View public profile
            </Link>
          )}
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div className="bg-[#0B1A4A] border border-[#6C86FF] px-4 py-3 text-xs text-[#E6E6E6] rounded-xl shadow-md">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-[#2A1010] border border-[#ff6c6c] px-4 py-3 text-xs text-[#ff6c6c] rounded-xl shadow-md">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section: Images (Banner & Avatar) */}
          <section className="bg-[#232525] border border-[#303232] p-6 space-y-5 rounded-2xl shadow-lg">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Profile Images
            </h2>

            {/* Banner Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Banner image (max 4 MB)
              </label>
              <div className="w-full h-36 bg-[#002EC1] relative overflow-hidden flex items-center justify-center border border-[#303232] rounded-xl">
                {bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute inset-0 bg-black/50 hover:bg-black/60 text-[#E6E6E6] flex items-center justify-center text-xs font-medium space-x-2 transition-colors cursor-pointer"
                >
                  <Upload size={16} strokeWidth={1.5} />
                  <span>{uploadingBanner ? "Uploading banner..." : "Change banner"}</span>
                </button>
                <input
                  type="file"
                  ref={bannerInputRef}
                  onChange={handleBannerUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Avatar image (max 2 MB)
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-[#002EC1] border-2 border-[#303232] overflow-hidden flex items-center justify-center text-2xl font-bold text-[#E6E6E6] rounded-full shadow-md">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (displayName[0] || "A").toUpperCase()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 text-xs font-medium bg-[#2B2D2D] hover:bg-[#353838] text-[#E6E6E6] border border-[#303232] transition-colors rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-sm hover:shadow"
                >
                  <Upload size={14} strokeWidth={1.5} />
                  <span>{uploadingAvatar ? "Uploading..." : "Change avatar"}</span>
                </button>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
              </div>
            </div>
          </section>

          {/* Section: Basic Information */}
          <section className="bg-[#232525] border border-[#303232] p-6 space-y-4 rounded-2xl shadow-lg">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Basic Info
            </h2>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Headline *
              </label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Writer & Visual Storyteller | Motion Specialist"
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Bio
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about your creative craft, artistic background, and vision..."
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Hyderabad, India"
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
              />
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Languages
              </label>
              <div className="flex flex-wrap gap-1.5">
                {languages.map((lang, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-3 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-full"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                      className="text-[#878787] hover:text-[#E6E6E6] cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && languageInput.trim()) {
                      e.preventDefault();
                      if (!languages.includes(languageInput.trim())) {
                        setLanguages([...languages, languageInput.trim()]);
                      }
                      setLanguageInput("");
                    }
                  }}
                  placeholder="Add language and press Enter"
                  className="flex-1 bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* Section: Skills */}
          <section className="bg-[#232525] border border-[#303232] p-6 space-y-3 rounded-2xl shadow-lg">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Skills & Disciplines
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 px-3 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-full"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                    className="text-[#878787] hover:text-[#E6E6E6] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skillInput.trim()) {
                  e.preventDefault();
                  if (!skills.includes(skillInput.trim())) {
                    setSkills([...skills, skillInput.trim()]);
                  }
                  setSkillInput("");
                }
              }}
              placeholder="e.g. Screenwriting, Colour Grading, Sound Design, Animation (press Enter)"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3.5 py-2 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-xl"
            />
          </section>

          {/* Section: Featured Works (Pick up to 3) */}
          <section className="bg-[#232525] border border-[#303232] p-6 space-y-4 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
                  Featured Creative Works
                </h2>
                <p className="text-[11px] text-[#A8A8A8]">
                  Pick up to 3 works to showcase prominently on your public profile.
                </p>
              </div>
              <span className="text-xs font-mono text-[#6C86FF]">
                {featuredFilmIds.length} / 3 selected
              </span>
            </div>

            {userFilms.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[#303232] space-y-2 rounded-xl">
                <FilmIcon size={22} strokeWidth={1.5} className="mx-auto text-[#878787]" />
                <p className="text-xs text-[#878787]">You haven&apos;t published any works yet.</p>
                <Link
                  href="/post"
                  className="inline-block text-xs font-semibold text-[#6C86FF] hover:underline uppercase"
                >
                  Publish your work
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {userFilms.map((film) => {
                  const isSelected = featuredFilmIds.includes(film.id);
                  const position = featuredFilmIds.indexOf(film.id) + 1;

                  return (
                    <div
                      key={film.id}
                      className={`flex items-center justify-between p-3.5 border transition-colors rounded-xl ${
                        isSelected
                          ? "bg-[#0B1A4A] border-[#6C86FF]/50"
                          : "bg-[#1A1C1C] border-[#303232]"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <div className="w-12 h-8 bg-[#000000] border border-[#303232] shrink-0 overflow-hidden relative rounded-lg flex items-center justify-center">
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
                            <FileText className="w-3.5 h-3.5 text-[#878787]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#E6E6E6] truncate">
                            {film.title}
                          </p>
                          <p className="text-[11px] font-mono text-[#878787] truncate">
                            c/{film.category_slug}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-[#002EC1] text-[#E6E6E6] text-[10px] font-mono font-bold rounded-md">
                            #{position}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFeaturedFilmIds(
                                featuredFilmIds.filter((id) => id !== film.id)
                              );
                            } else {
                              if (featuredFilmIds.length >= 3) {
                                setErrorMessage(
                                  "You can only feature up to 3 creative works."
                                );
                                return;
                              }
                              setFeaturedFilmIds([...featuredFilmIds, film.id]);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold border transition-all duration-200 rounded-lg cursor-pointer ${
                            isSelected
                              ? "bg-[#2E3030] border-[#303232] text-[#E6E6E6] hover:text-red-400"
                              : "bg-[#002EC1] border-transparent text-[#E6E6E6] hover:bg-[#1F4BE0]"
                          }`}
                        >
                          {isSelected ? "Remove" : "Feature"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-sm font-semibold transition-all duration-200 rounded-xl disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              {saving ? "Saving changes..." : "Save profile"}
            </button>
          </div>
        </form>

        {/* Section: Experience Entries Manager */}
        <section className="bg-[#232525] border border-[#303232] p-6 space-y-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
                Experience & Credits
              </h2>
              <p className="text-[11px] text-[#A8A8A8]">
                Add creative projects, artistic collaborations, and roles.
              </p>
            </div>
            {!isAddingExp && (
              <button
                type="button"
                onClick={() => {
                  setEditingExpId(null);
                  setExpTitle("");
                  setExpOrg("");
                  setExpStartYear(new Date().getFullYear());
                  setExpEndYear("");
                  setExpDescription("");
                  setExpLink("");
                  setIsAddingExp(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232] transition-colors rounded-xl cursor-pointer"
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Add entry</span>
              </button>
            )}
          </div>

          {/* Experience Form */}
          {isAddingExp && (
            <form
              onSubmit={handleSaveExperience}
              className="bg-[#1A1C1C] border border-[#303232] p-5 space-y-3 rounded-xl"
            >
              <div className="flex items-center justify-between border-b border-[#303232] pb-2">
                <span className="text-xs font-semibold text-[#E6E6E6]">
                  {editingExpId ? "Edit experience" : "New experience entry"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingExp(false)}
                  className="text-[#878787] hover:text-[#E6E6E6] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#A8A8A8]">
                    Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g. Director, Concept Artist, Sound Designer"
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#A8A8A8]">
                    Project or Organisation *
                  </label>
                  <input
                    type="text"
                    required
                    value={expOrg}
                    onChange={(e) => setExpOrg(e.target.value)}
                    placeholder="e.g. Independent Work 'Anaganaga'"
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#A8A8A8]">
                    Start Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={expStartYear}
                    onChange={(e) => setExpStartYear(Number(e.target.value))}
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#A8A8A8]">
                    End Year (Leave empty if present)
                  </label>
                  <input
                    type="number"
                    value={expEndYear}
                    onChange={(e) => setExpEndYear(e.target.value)}
                    placeholder="Present"
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#A8A8A8]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Key contributions and achievements..."
                  className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#A8A8A8]">
                  Link (optional)
                </label>
                <input
                  type="url"
                  value={expLink}
                  onChange={(e) => setExpLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExp(false)}
                  className="px-3 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] text-[#E6E6E6] transition-colors rounded-lg cursor-pointer"
                >
                  {editingExpId ? "Update entry" : "Save entry"}
                </button>
              </div>
            </form>
          )}

          {/* List of existing experiences */}
          {experiences.length > 0 ? (
            <div className="space-y-2">
              {experiences.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3.5 bg-[#1A1C1C] border border-[#303232] rounded-xl"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <p className="text-xs font-semibold text-[#E6E6E6] truncate">
                      {exp.title}
                    </p>
                    <p className="text-[11px] text-[#A8A8A8] truncate">
                      {exp.org_or_project} • {exp.start_year} — {exp.end_year ?? "Present"}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveExperience(idx, "up")}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1 text-[#878787] hover:text-[#E6E6E6] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExperience(idx, "down")}
                      disabled={idx === experiences.length - 1}
                      title="Move down"
                      className="p-1 text-[#878787] hover:text-[#E6E6E6] disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditExperienceClick(exp)}
                      className="px-2 py-1 text-[11px] text-[#6C86FF] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="p-1 text-[#ff6c6c] hover:opacity-80 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#878787]">
              No experience entries added yet.
            </p>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
