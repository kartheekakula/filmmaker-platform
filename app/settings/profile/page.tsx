"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/utils/image";
import { AppLayout } from "@/components/shell/AppLayout";
import type { Profile, ProfileExperience } from "@/lib/types";
import {
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  X,
  ExternalLink,
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

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");

  const [favDialogue, setFavDialogue] = useState("");
  const [favDialogueSource, setFavDialogueSource] = useState("");

  const [favFilmmakers, setFavFilmmakers] = useState<string[]>([]);
  const [filmmakerInput, setFilmmakerInput] = useState("");

  const [favGenres, setFavGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState("");

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
        setFavDialogue(p.fav_dialogue || "");
        setFavDialogueSource(p.fav_dialogue_source || "");
        setFavFilmmakers(p.fav_filmmakers || []);
        setFavGenres(p.fav_genres || []);
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

    if (favDialogue.length > 200) {
      setErrorMessage("Favourite dialogue cannot exceed 200 characters.");
      return;
    }

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
        fav_dialogue: favDialogue.trim() || null,
        fav_dialogue_source: favDialogueSource.trim() || null,
        fav_filmmakers: favFilmmakers.slice(0, 5),
        fav_genres: favGenres.slice(0, 5),
        skills,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }).eq("id", userId);

      if (error) throw error;

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
          <div className="bg-[#0B1A4A] border border-[#6C86FF] px-4 py-2.5 text-xs text-[#E6E6E6] rounded-none">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-[#2A1010] border border-[#ff6c6c] px-4 py-2.5 text-xs text-[#ff6c6c] rounded-none">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Section: Images (Banner & Avatar) */}
          <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Profile Images
            </h2>

            {/* Banner Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Banner image (max 4 MB)
              </label>
              <div className="w-full h-32 bg-[#002EC1] relative overflow-hidden flex items-center justify-center border border-[#303232]">
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
                <div className="w-20 h-20 bg-[#002EC1] border border-[#303232] overflow-hidden flex items-center justify-center text-2xl font-bold text-[#E6E6E6] rounded-none">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (displayName[0] || "U").toUpperCase()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-2 text-xs font-medium bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232] transition-colors rounded-none flex items-center space-x-1.5"
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
          <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
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
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                placeholder="e.g. Writer & Cinematographer | Microfilm Specialist"
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                placeholder="Tell others about your filmmaking background and vision..."
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                      className="text-[#878787] hover:text-[#E6E6E6]"
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
                  className="flex-1 bg-[#1A1C1C] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
                />
              </div>
            </div>
          </section>

          {/* Section: Favourite Dialogue (Max 200) */}
          <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
                Favourite Dialogue (Pinned Quote)
              </h2>
              <span className={`text-[11px] font-mono ${
                favDialogue.length > 200 ? "text-[#ff6c6c]" : "text-[#878787]"
              }`}>
                {favDialogue.length}/200
              </span>
            </div>

            <div className="space-y-1">
              <textarea
                rows={2}
                maxLength={200}
                value={favDialogue}
                onChange={(e) => setFavDialogue(e.target.value)}
                placeholder="e.g. గుర్తుంచుకో శంభో, భయం అనేది ఒక్క క్షణం మాత్రమే ఉంటుంది..."
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Dialogue Source / Film
              </label>
              <input
                type="text"
                value={favDialogueSource}
                onChange={(e) => setFavDialogueSource(e.target.value)}
                placeholder="e.g. Shiva (1989)"
                className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
              />
            </div>
          </section>

          {/* Section: Film DNA (Max 5 filmmakers, Max 5 genres) */}
          <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Film DNA
            </h2>

            {/* Filmmakers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#A8A8A8]">
                  Favourite Filmmakers (Max 5)
                </label>
                <span className="text-[11px] font-mono text-[#878787]">
                  {favFilmmakers.length}/5
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {favFilmmakers.map((d, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                  >
                    <span>{d}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFavFilmmakers(favFilmmakers.filter((_, i) => i !== idx))
                      }
                      className="text-[#878787] hover:text-[#E6E6E6]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {favFilmmakers.length < 5 && (
                <input
                  type="text"
                  value={filmmakerInput}
                  onChange={(e) => setFilmmakerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filmmakerInput.trim()) {
                      e.preventDefault();
                      if (!favFilmmakers.includes(filmmakerInput.trim())) {
                        setFavFilmmakers([...favFilmmakers, filmmakerInput.trim()]);
                      }
                      setFilmmakerInput("");
                    }
                  }}
                  placeholder="e.g. Mani Ratnam (press Enter)"
                  className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
                />
              )}
            </div>

            {/* Genres */}
            <div className="space-y-2 pt-2 border-t border-[#303232]">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-[#A8A8A8]">
                  Favourite Genres (Max 5)
                </label>
                <span className="text-[11px] font-mono text-[#878787]">
                  {favGenres.length}/5
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {favGenres.map((g, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                  >
                    <span>{g}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFavGenres(favGenres.filter((_, i) => i !== idx))
                      }
                      className="text-[#878787] hover:text-[#E6E6E6]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {favGenres.length < 5 && (
                <input
                  type="text"
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && genreInput.trim()) {
                      e.preventDefault();
                      if (!favGenres.includes(genreInput.trim())) {
                        setFavGenres([...favGenres, genreInput.trim()]);
                      }
                      setGenreInput("");
                    }
                  }}
                  placeholder="e.g. Neo-Noir, Crime, Drama (press Enter)"
                  className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
                />
              )}
            </div>
          </section>

          {/* Section: Skills */}
          <section className="bg-[#232525] border border-[#303232] p-5 space-y-3 rounded-none">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
              Skills & Disciplines
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1A1C1C] border border-[#303232] text-[#E6E6E6] rounded-none"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                    className="text-[#878787] hover:text-[#E6E6E6]"
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
              placeholder="e.g. Screenwriting, Colour Grading, Sound Design (press Enter)"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
            />
          </section>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-sm font-semibold transition-colors rounded-none disabled:opacity-50"
            >
              {saving ? "Saving changes..." : "Save profile"}
            </button>
          </div>
        </form>

        {/* Section: Experience Entries Manager */}
        <section className="bg-[#232525] border border-[#303232] p-5 space-y-4 rounded-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold text-[#878787]">
                Experience
              </h2>
              <p className="text-[11px] text-[#A8A8A8]">
                Add film projects, roles, and creative work.
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
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232] transition-colors rounded-none"
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
              className="bg-[#1A1C1C] border border-[#303232] p-4 space-y-3 rounded-none"
            >
              <div className="flex items-center justify-between border-b border-[#303232] pb-2">
                <span className="text-xs font-semibold text-[#E6E6E6]">
                  {editingExpId ? "Edit experience" : "New experience entry"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingExp(false)}
                  className="text-[#878787] hover:text-[#E6E6E6]"
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
                    placeholder="e.g. Director, Assistant Editor"
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                    placeholder="e.g. Independent Short Film 'Anaganaga'"
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                    className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                  className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
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
                  className="w-full bg-[#232525] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExp(false)}
                  className="px-3 py-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] text-[#E6E6E6] transition-colors rounded-none"
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
                  className="flex items-center justify-between p-3 bg-[#1A1C1C] border border-[#303232] rounded-none"
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
                      className="p-1 text-[#878787] hover:text-[#E6E6E6] disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExperience(idx, "down")}
                      disabled={idx === experiences.length - 1}
                      title="Move down"
                      className="p-1 text-[#878787] hover:text-[#E6E6E6] disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditExperienceClick(exp)}
                      className="px-2 py-1 text-[11px] text-[#6C86FF] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="p-1 text-[#ff6c6c] hover:opacity-80"
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
