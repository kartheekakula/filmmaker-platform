"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const initialError = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError ?? "");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (data.user) {
          // Check if onboarding completed
          const { data: profile } = await supabase
            .from("profiles")
            .select("headline")
            .eq("id", data.user.id)
            .single();

          if (!profile?.headline) {
            router.push("/onboarding");
          } else {
            router.push(next);
          }
          router.refresh();
        }
      } else {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (error) {
          setErrorMessage(error.message);
        } else if (data.session) {
          // Immediately signed in (email confirmation disabled)
          router.push("/onboarding");
          router.refresh();
        } else {
          // Confirmation email sent
          setMagicLinkSent(true);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setErrorMessage(error.message);
        setOauthLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Google sign-in failed."
      );
      setOauthLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-[#232525] border border-[#303232] p-6 space-y-6 rounded-none">
      <div className="space-y-1">
        <Link
          href="/"
          className="font-display text-2xl tracking-wider text-[#E6E6E6] hover:text-[#6C86FF] transition-colors"
        >
          FILMMAKER
        </Link>
        <p className="text-xs text-[#A8A8A8]">
          {mode === "signin"
            ? "Sign in to your account"
            : "Create an account to publish and build your film profile"}
        </p>
      </div>

      {/* Google OAuth Button */}
      <div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading || loading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#2E3030] hover:bg-[#383a3a] text-[#E6E6E6] border border-[#303232] text-sm font-medium transition-colors rounded-none disabled:opacity-50"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="#E6E6E6"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#E6E6E6"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#E6E6E6"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#E6E6E6"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{oauthLoading ? "Connecting..." : "Continue with Google"}</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-[#303232] w-full" />
        <span className="bg-[#232525] px-2 text-[11px] text-[#878787] uppercase tracking-wider absolute">
          or
        </span>
      </div>

      {magicLinkSent ? (
        <div className="bg-[#0B1A4A] border border-[#6C86FF] p-4 space-y-2 text-left">
          <p className="text-sm font-medium text-[#E6E6E6]">Check your email</p>
          <p className="text-xs text-[#A8A8A8]">
            We sent a verification link to <span className="text-[#E6E6E6]">{email}</span>. Click the link to complete sign-up.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="text-xs text-[#6C86FF] underline pt-2 block"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#A8A8A8]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full bg-[#1A1C1C] border border-[#303232] px-3 py-2 text-sm text-[#E6E6E6] placeholder-[#878787] focus:outline-none focus:border-[#6C86FF] transition-colors rounded-none disabled:opacity-50"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-[#6C86FF]">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading || oauthLoading}
            className="w-full bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] py-2.5 text-sm font-semibold transition-colors rounded-none disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrorMessage("");
              }}
              className="text-xs text-[#A8A8A8] hover:text-[#E6E6E6] transition-colors"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm bg-[#232525] border border-[#303232] p-8 text-center text-xs text-[#878787]">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
