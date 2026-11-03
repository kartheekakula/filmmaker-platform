"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Festival, FestivalKind, FestivalWorkMode } from "@/lib/types";
import { createFestival, updateFestival } from "@/lib/festivals";
import { createClient } from "@/lib/supabase/client";

interface FestivalFormProps {
  initialData?: Festival | null;
}

export function FestivalForm({ initialData }: FestivalFormProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const isEdit = !!initialData;

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [organiser, setOrganiser] = useState(initialData?.organiser || "");
  const [kind, setKind] = useState<FestivalKind>(initialData?.kind || "festival");
  const [workMode, setWorkMode] = useState<FestivalWorkMode>(initialData?.work_mode || "in_person");
  const [city, setCity] = useState(initialData?.city || "");
  const [startsOn, setStartsOn] = useState(initialData?.starts_on || "");
  const [endsOn, setEndsOn] = useState(initialData?.ends_on || "");
  const [submitBy, setSubmitBy] = useState(initialData?.submit_by || "");
  const [feeText, setFeeText] = useState(initialData?.fee_text || "");
  const [studentFriendly, setStudentFriendly] = useState<boolean>(initialData?.student_friendly || false);
  const [description, setDescription] = useState(initialData?.description || "");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.website_url || "");
  const [submitUrl, setSubmitUrl] = useState(initialData?.submit_url || "");
  const [isPublished, setIsPublished] = useState<boolean>(initialData?.is_published ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = tagInput.trim();
      if (!trimmed) return;
      if (tags.length >= 5) {
        setFormError("At most 5 tags allowed.");
        return;
      }
      if (trimmed.length > 24) {
        setFormError("Each tag can be at most 24 characters.");
        return;
      }
      if (!tags.includes(trimmed)) {
        setTags((prev) => [...prev, trimmed]);
      }
      setTagInput("");
      setFormError(null);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Client-side validations
    if (!name.trim() || name.trim().length < 3) {
      setFormError("Name must be at least 3 characters.");
      return;
    }
    if (!organiser.trim()) {
      setFormError("Organiser name is required.");
      return;
    }
    if (workMode !== "online" && !city.trim()) {
      setFormError("City is required when not online.");
      return;
    }
    if (!startsOn) {
      setFormError("Start date is required.");
      return;
    }
    if (!endsOn) {
      setFormError("End date is required.");
      return;
    }
    if (endsOn < startsOn) {
      setFormError("End date cannot be before start date.");
      return;
    }
    if (!websiteUrl.trim().toLowerCase().startsWith("https://")) {
      setFormError("Website URL must start with https://");
      return;
    }
    if (submitUrl.trim() && !submitUrl.trim().toLowerCase().startsWith("https://")) {
      setFormError("Submit URL must start with https://");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      organiser: organiser.trim(),
      kind,
      work_mode: workMode,
      city: workMode === "online" ? null : city.trim(),
      starts_on: startsOn,
      ends_on: endsOn,
      submit_by: submitBy || null,
      fee_text: feeText.trim() || null,
      student_friendly: studentFriendly,
      description: description.trim() || null,
      tags,
      website_url: websiteUrl.trim(),
      submit_url: submitUrl.trim() || null,
      is_published: isPublished,
    };

    try {
      if (isEdit && initialData) {
        await updateFestival(supabase, initialData.id, payload);
      } else {
        await createFestival(supabase, payload);
      }
      router.push("/admin/festivals");
    } catch (err: any) {
      console.error("Festival save error:", err);
      setFormError(err?.message || "Failed to save festival.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[640px] mx-auto space-y-6 pb-20">
      {/* Top Nav */}
      <div className="flex items-center space-x-2">
        <Link
          href="/admin/festivals"
          className="text-xs text-[#878787] hover:text-[#E6E6E6] flex items-center space-x-1"
        >
          <ArrowLeft size={13} />
          <span>Festivals</span>
        </Link>
        <span className="text-xs text-[#878787]">•</span>
        <span className="text-xs font-mono text-[#6C86FF]">
          {isEdit ? "Edit Festival" : "New Festival"}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#232525] border border-[#303232] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl"
      >
        <h2 className="font-heading text-xl text-[#E6E6E6] pb-1 border-b border-[#303232]">
          {isEdit ? "Edit festival" : "New festival"}
        </h2>

        {/* Name */}
        <div className="space-y-1">
          <label className="block text-[11px] font-mono text-[#878787] uppercase">
            Festival / Event Name *
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mumbai Independent Film Festival"
            className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF]"
          />
        </div>

        {/* Organiser */}
        <div className="space-y-1">
          <label className="block text-[11px] font-mono text-[#878787] uppercase">
            Organiser *
          </label>
          <input
            type="text"
            required
            maxLength={60}
            value={organiser}
            onChange={(e) => setOrganiser(e.target.value)}
            placeholder="e.g. Cinephile Society"
            className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none focus:border-[#6C86FF]"
          />
        </div>

        {/* Kind & Work Mode */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Kind *
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as FestivalKind)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            >
              <option value="festival">Festival</option>
              <option value="screening">Screening</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Mode *
            </label>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value as FestivalWorkMode)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            >
              <option value="online">Online</option>
              <option value="in_person">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* City (when not online) */}
        {workMode !== "online" && (
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              City *
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Starts On *
            </label>
            <input
              type="date"
              required
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Ends On *
            </label>
            <input
              type="date"
              required
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit By & Fee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Submit / Register By
            </label>
            <input
              type="date"
              value={submitBy}
              onChange={(e) => setSubmitBy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Fee Text
            </label>
            <input
              type="text"
              maxLength={30}
              value={feeText}
              onChange={(e) => setFeeText(e.target.value)}
              placeholder="e.g. Free or ₹500"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>
        </div>

        {/* Student Friendly Checkbox */}
        <div className="flex items-center space-x-2.5 pt-1">
          <input
            type="checkbox"
            id="studentFriendly"
            checked={studentFriendly}
            onChange={(e) => setStudentFriendly(e.target.checked)}
            className="w-4 h-4 rounded border-[#303232] text-[#002EC1] focus:ring-0 cursor-pointer"
          />
          <label
            htmlFor="studentFriendly"
            className="text-xs text-[#E6E6E6] cursor-pointer select-none"
          >
            Student friendly
          </label>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-[11px] font-mono text-[#878787] uppercase">
            Description
          </label>
          <textarea
            maxLength={600}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of the festival..."
            className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end text-[10px] font-mono text-[#878787]">
            {description.length}/600
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <label className="block text-[11px] font-mono text-[#878787] uppercase">
            Tags (up to 5)
          </label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type tag and press Enter"
            className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs bg-[#1C1E1E] border border-[#303232] text-[#E6E6E6] rounded-full"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-[#878787] hover:text-[#E6E6E6] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* URLs */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Website URL *
            </label>
            <input
              type="url"
              required
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://festival-website.org"
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-[#878787] uppercase">
              Submit / Registration URL (optional)
            </label>
            <input
              type="url"
              value={submitUrl}
              onChange={(e) => setSubmitUrl(e.target.value)}
              placeholder="https://filmfreeway.com/..."
              className="w-full px-3.5 py-2.5 bg-[#1C1E1E] border border-[#303232] rounded-xl text-sm text-[#E6E6E6] focus:outline-none"
            />
          </div>
        </div>

        {/* Published Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#1C1E1E] border border-[#303232] rounded-xl pt-2">
          <div>
            <span className="text-xs font-semibold text-[#E6E6E6] block">Published</span>
            <span className="text-[11px] text-[#878787] block">
              Make this entry publicly visible in the Film Festivals directory
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPublished((prev) => !prev)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isPublished ? "bg-[#002EC1]" : "bg-[#303232]"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full transition-transform ${
                isPublished ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Form Error */}
        {formError && (
          <p className="text-xs text-red-400 font-mono pt-1">{formError}</p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#303232]">
          <Link
            href="/admin/festivals"
            className="px-4 py-2 text-xs border border-[#303232] text-[#A8A8A8] rounded-xl hover:text-[#E6E6E6]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] rounded-xl flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            <span>{isEdit ? "Save changes" : "Create festival"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
