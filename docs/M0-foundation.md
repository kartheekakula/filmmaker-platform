# M0: Foundation and app shell

Estimated effort: 4 to 6 hours. Paste the prompt below into Antigravity. Review the plan before approving.

## Before you start
1. Create a GitHub repo and a Supabase project (note the project URL, anon key and the pooled connection string).
2. Link the repo to Vercel.
3. Put `AGENTS.md` at the repo root.

## Prompt

> Read AGENTS.md fully. We are building M0 only. Show a plan first and wait for my approval.
>
> **1. Project setup.** Create a Next.js App Router project with TypeScript and Tailwind. Create the folders `app/`, `components/`, `lib/supabase/`, `lib/ai/`, `supabase/migrations/`. Add `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY` (placeholders only).
>
> **2. Design tokens.** Put the colours, spacing scale and `border-radius: 0` default in Tailwind config and global CSS. Load Anton, Source Sans 3 and Noto Sans Telugu with `next/font` and set the font stacks as described in AGENTS.md. Add the faint light film grain over the page with an SVG noise in CSS. Install `lucide-react` (approved) and use it for every icon, outline style, stroke 1.5.
>
> **3. Supabase.** Browser client, server client (cookie based) and middleware that refreshes the session. No sign-in screens yet.
>
> **4. Migrations.** Write SQL migrations in `supabase/migrations/` for every table in the data model, including: constraints (duration 1 to 180 seconds, field length limits, unique pairs), foreign keys, indexes from the performance rules, RLS policies exactly as listed in the security section, the storage buckets `avatars` and `banners` with their policies, triggers that keep `follower_count`, `following_count` and `like_count` correct, and the seeded categories.
>
> **5. App shell (mobile first).**
> - Top bar: hamburger button (left), title (Home or the current channel), square profile avatar placeholder (right).
> - Drawer opened by the hamburger: Popular, Explore, then a "Channels" section listing every category from the database. The active item has a 3px left bar in `#6C86FF` and a `#0B1A4A` background. Close on outside tap or Escape. On desktop (min 1024px) show it as a persistent left sidebar instead.
> - Feed column with three skeleton film cards.
> - Fixed bottom tab bar: Festivals, Collaborate, Post, AI feedback, each with a Lucide outline icon and a label. Post is the only filled blue element.
>
> **6. Placeholder routes.** `/festivals` and `/collaborate` show a static coming-soon screen with a short line and an email field that inserts into `waitlist` (with the right feature value) and shows a confirmation. `/post` and `/ai` show a plain "Coming in the next milestone" screen. `/popular`, `/explore` and `/c/[slug]` render the shell with skeletons.
>
> Do not build auth, profiles, films, feed data or AI. Do not install Lenis, GSAP or React Bits.
>
> At the end: how to run locally, how to apply migrations to my Supabase project, how to deploy to Vercel, and a manual test checklist.

## Done when
- The app runs locally and on Vercel.
- Migrations apply cleanly and RLS shows as enabled on every table in Supabase.
- The drawer opens and closes, the four tabs navigate, and the waitlist form saves a row.
- Telugu text renders correctly in a test string.
- No white appears anywhere in the UI. All text meets contrast on the dark surfaces.
