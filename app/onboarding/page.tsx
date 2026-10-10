"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SUGGESTED_LANGUAGES = [
  "Telugu",
  "English",
  "Hindi",
  "Tamil",
  "Malayalam",
  "Kannada",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["Telugu"]);
  const [customLanguage, setCustomLanguage] = useState("");

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"available" | "taken" | "invalid" | "idle">("idle");
  const [usernameError, setUsernameError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Check auth and prefill if existing profile
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/onboarding");
        return;
      }

      setUserId(user.id);

      // Check existing profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.username && !profile.username.includes("_")) {
          setUsername(profile.username);
        } else if (user.email) {
          const suggested = user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
          setUsername(suggested);
        }
        if (profile.headline) setHeadline(profile.headline);
        if (profile.location) setLocation(profile.location);
        if (profile.languages && profile.languages.length > 0) {
          setSelectedLanguages(profile.languages);
        }
      }

      setLoadingUser(false);
    }

    loadUser();
  }, [router, supabase]);

  // Debounced live username availability check
  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }

    const clean = username.trim().toLowerCase();
    const valid = /^[a-z0-9_]{3,20}$/.test(clean);

    if (!valid) {
      setUsernameStatus("invalid");
      setUsernameError("3-20 characters: lowercase letters, numbers, underscores only");
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", clean)
          .neq("id", userId ?? "")
          .maybeSingle();

        if (error) {
          setUsernameStatus("idle");
        } else if (data) {
          setUsernameStatus("taken");
          setUsernameError("Username is already taken");
        } else {
          setUsernameStatus("available");
          setUsernameError("");
        }
      } catch {
        setUsernameStatus("idle");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, userId, supabase]);

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const addCustomLanguage = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customLanguage.trim()) {
      e.preventDefault();
      const lang = customLanguage.trim();
      if (!selectedLanguages.includes(lang)) {
        setSelectedLanguages([...selectedLanguages, lang]);
      }
      setCustomLanguage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      setErrorMessage("Please choose a valid and available username.");
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage("Display name is required.");
      return;
    }

    if (!headline.trim()) {
      setErrorMessage("Headline is required.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const cleanUsername = username.trim().toLowerCase();
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        username: cleanUsername,
        display_name: displayName.trim(),
        headline: headline.trim(),
        location: location.trim() || null,
        languages: selectedLanguages,
      });

      if (error) {
        setErrorMessage(error.message);
        setSubmitting(false);
      } else {
        router.push(`/u/${cleanUsername}`);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save profile."
      );
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-xs text-[#878787]">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#232525] border border-[#303232] p-6 space-y-6 rounded-none">
        <div className="space-y-1">
          <span className="font-display text-xl tracking-wider text-[#E6E6E6]">
            BUILD YOUR PROFILE
          </span>
          <p className="text-xs text-[#A8A8A8]">
            Set up your filmmaker identity to start publishing and collaborating.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Tarun Bhascker"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#A8A8A8]">
                Username *
              </label>
              {isCheckingUsername && (
                <span className="text-[11px] text-[#878787]">Checking...</span>
              )}
              {!isCheckingUsername && usernameStatus === "available" && (
                <span className="text-[11px] text-[#6C86FF]">Available</span>
              )}
              {!isCheckingUsername && usernameStatus === "taken" && (
                <span className="text-[11px] text-[#ff6c6c]">Unavailable</span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-[#878787]">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                className="w-full bg-[#1A1C1C] border border-[#303232] pl-7 pr-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
              />
            </div>
            {usernameError && (
              <p className="text-[11px] text-[#6C86FF]">{usernameError}</p>
            )}
          </div>

          {/* Headline */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Headline *
            </label>
            <input
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Writer & Director | Microfilm Creator"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hyderabad, Telangana"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
            />
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Languages
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-2.5 py-1 text-xs border transition-colors rounded-none ${
                      isSelected
                        ? "bg-[#0B1A4A] border-[#6C86FF] text-[#E6E6E6]"
                        : "bg-[#1A1C1C] border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6]"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              onKeyDown={addCustomLanguage}
              placeholder="Type other language and press Enter"
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-1.5 text-xs text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-[#6C86FF]">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={submitting || usernameStatus === "taken" || usernameStatus === "invalid"}
            className="w-full bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] py-2.5 text-sm font-semibold transition-colors rounded-none disabled:opacity-50"
          >
            {submitting ? "Saving profile..." : "Complete profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
