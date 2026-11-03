"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { CATEGORIES } from "@/lib/constants";
import { WorkMode, PayType } from "@/lib/types";
import { createCollabRequest } from "@/lib/collab";
import { createClient } from "@/lib/supabase/client";

export default function NewCollabPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Form Fields
  const [title, setTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode>("remote");
  const [city, setCity] = useState("");
  const [body, setBody] = useState("");

  // Under More
  const [showMore, setShowMore] = useState(false);
  const [payType, setPayType] = useState<PayType>("unpaid");
  const [payNote, setPayNote] = useState("");
  const [durationText, setDurationText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [applyBy, setApplyBy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/collaborate/new");
        return;
      }

      setCurrentUserId(user.id);

      try {
        const { data: restricted } = await supabase.rpc("is_restricted", {
          uid: user.id,
        });
        if (restricted) setIsRestricted(true);
      } catch {
        // RPC check fallback
      } finally {
        setLoadingUser(false);
      }
    }

    checkAuth();
  }, [supabase, router]);

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = skillInput.trim();
      if (!trimmed) return;
      if (skills.length >= 5) {
        setFormError("At most 5 skills allowed.");
        return;
      }
      if (trimmed.length > 24) {
        setFormError("Each skill can be at most 24 characters.");
        return;
      }
      if (!skills.includes(trimmed)) {
        setSkills((prev) => [...prev, trimmed]);
      }
      setSkillInput("");
      setFormError(null);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || submitting) return;

    if (!title.trim() || title.trim().length < 3) {
      setFormError("Title must be at least 3 characters.");
      return;
    }
    if (!roleSlug) {
      setFormError("Select a role.");
      return;
    }
    if (workMode !== "remote" && (!city.trim() || city.trim().length === 0)) {
      setFormError("City is required when not remote.");
      return;
    }
    if (!body.trim() || body.trim().length < 10) {
      setFormError("Details must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const newCollab = await createCollabRequest(supabase, currentUserId, {
        title: title.trim(),
        role_slug: roleSlug,
        work_mode: workMode,
        city: workMode === "remote" ? null : city.trim(),
        body: body.trim(),
        pay_type: payType,
        pay_note: payType === "paid" ? payNote.trim() || null : null,
        duration_text: durationText.trim() || null,
        skills,
        apply_by: applyBy || null,
      });

      router.push(`/collaborate/${newCollab.id}`);
    } catch (err: any) {
      console.error("Collab create error:", err);
      const msg = err?.message || "";
      if (msg.includes("3 open collaboration requests")) {
        setFormError("You can have at most 3 open collaboration requests at a time.");
      } else {
        setFormError(msg || "Failed to create request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <AppLayout title="Collaborate">
        <div className="py-20 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#6C86FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (isRestricted) {
    return (
      <AppLayout title="Collaborate">
        <div className="py-20 text-center text-sm text-[#878787] font-mono">
          Account restricted
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Collaborate">
      <div className="max-w-[620px] mx-auto space-y-5 pb-16">
        {/* Back Link */}
        <div>
          <Link
            href="/collaborate"
            className="inline-flex items-center space-x-1.5 text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span>Collaborate</span>
          </Link>
        </div>

        {/* Minimal Single-Column Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#232525] border border-[#303232] rounded-2xl p-5 sm:p-7 space-y-4 shadow-xl"
        >
          {/* Title */}
          <div>
            <input
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
            />
          </div>

          {/* Role Dropdown */}
          <div>
            <select
              required
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors"
            >
              <option value="" disabled>
                Select role
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode as Three Buttons */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 gap-2">
              {(["remote", "in_person", "hybrid"] as WorkMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkMode(mode)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    workMode === mode
                      ? "bg-[#002EC1] border-[#002EC1] text-[#E6E6E6]"
                      : "bg-[#1C1E1E] border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6] hover:bg-[#252727]"
                  }`}
                >
                  {mode === "remote"
                    ? "Remote"
                    : mode === "in_person"
                    ? "In person"
                    : "Hybrid"}
                </button>
              ))}
            </div>
          </div>

          {/* City (appears only when mode is not remote) */}
          {workMode !== "remote" && (
            <div>
              <input
                type="text"
                required
                maxLength={40}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
              />
            </div>
          )}

          {/* Details Textarea */}
          <div className="space-y-1">
            <textarea
              required
              maxLength={600}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] resize-none leading-relaxed transition-colors"
            />
            <div className="flex justify-end text-[10px] font-mono text-[#878787]">
              {body.length}/600
            </div>
          </div>

          {/* More Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="inline-flex items-center space-x-1.5 text-xs text-[#6C86FF] hover:underline font-mono cursor-pointer"
            >
              <span>{showMore ? "Fewer options" : "More options"}</span>
              {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Under More Options */}
          {showMore && (
            <div className="space-y-4 pt-2 border-t border-[#303232] animate-in fade-in duration-150">
              {/* Pay as Two Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayType("unpaid")}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      payType === "unpaid"
                        ? "bg-[#002EC1] border-[#002EC1] text-[#E6E6E6]"
                        : "bg-[#1C1E1E] border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6]"
                    }`}
                  >
                    Unpaid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayType("paid")}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      payType === "paid"
                        ? "bg-[#002EC1] border-[#002EC1] text-[#E6E6E6]"
                        : "bg-[#1C1E1E] border-[#303232] text-[#A8A8A8] hover:text-[#E6E6E6]"
                    }`}
                  >
                    Paid
                  </button>
                </div>

                {payType === "paid" && (
                  <input
                    type="text"
                    maxLength={40}
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="Amount or compensation"
                    className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
                  />
                )}
              </div>

              {/* Duration */}
              <div>
                <input
                  type="text"
                  maxLength={24}
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                  placeholder="Duration (e.g. 2 weeks, 3 months)"
                  className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Add skill and press Enter (up to 5)"
                  className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors"
                />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(s)}
                          className="text-[#878787] hover:text-[#E6E6E6] cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply by date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[#878787]">
                  Apply by
                </label>
                <input
                  type="date"
                  value={applyBy}
                  onChange={(e) => setApplyBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Form Error */}
          {formError && (
            <p className="text-xs text-red-400 font-mono pt-1">{formError}</p>
          )}

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              <span>{submitting ? "Posting..." : "Post"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

