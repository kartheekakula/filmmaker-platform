"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface WaitlistFormProps {
  feature: "festivals" | "collaborate";
}

export function WaitlistForm({ feature }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("waitlist").insert([
        {
          email: email.trim().toLowerCase(),
          feature,
        },
      ]);

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Could not save. Try again.");
      } else {
        setStatus("success");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="bg-[#232525] border border-[#303232] p-5 text-left space-y-2">
        <p className="text-sm font-semibold text-[#E6E6E6]">
          You are on the list.
        </p>
        <p className="text-xs text-[#A8A8A8]">
          We will notify you when early access opens for {feature}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === "loading"}
          className="flex-1 bg-[#232525] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] px-5 py-2 text-sm font-semibold transition-colors rounded-none shrink-0 disabled:opacity-50"
        >
          {status === "loading" ? "Saving..." : "Join"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-xs text-[#6C86FF]">{errorMessage}</p>
      )}
    </form>
  );
}
