# AGENTS.md

Read this file before every task. It is the source of truth. If a request conflicts with it, stop and ask.

## Product
A Telugu-first platform for creatives to publish 1 to 3 minute microfilms, build a film-centred profile, and get honest AI script feedback. This is a prototype for a pitch and a 20-person college film club test. The product owner (Kartheek) decides every feature and design choice. Never add features, pages, libraries or visual effects that were not requested.

## Stack
- Next.js (App Router) + TypeScript, Tailwind CSS
- Supabase: Postgres, Auth (Google and email), Storage
- Vercel hosting, GitHub source
- Films in v1 are YouTube links (no video hosting)
- AI (from M3) behind one function in `lib/ai/review.ts`

## Routes
`/` home feed (all channels, newest first), `/popular`, `/explore`, `/c/[slug]` channel feed, `/f/[id]` film, `/u/[username]` profile, `/settings/profile` edit profile, `/post`, `/ai`, `/festivals`, `/collaborate`, `/login`, `/onboarding`.

## Design system (mobile first, minimal, quiet, in the spirit of Reddit, Medium and Substack's dark look)
- **Layout:** top bar with a hamburger (left, opens the channel drawer), a title (Home or the channel name) and a square profile avatar (right, opens the profile menu). Film cards in a single feed column. Fixed bottom tab bar with four tabs: Festivals, Collaborate, Post, AI feedback. Post is the only filled blue element in the bar. On desktop the drawer becomes a persistent left sidebar (240px) and the feed column is centred (max 680px).
- **Surfaces (dark, no white anywhere):** page `#000000`. Content surfaces (cards, top bar, drawer, tab bar) `#232525`. Hover surface `#2E3030`. Hairlines `1px solid #303232`.
- **Text:** primary `#E6E6E6`, secondary `#A8A8A8`, tertiary `#878787` (timestamps and hints only). Never use pure white.
- **Accent, the only strong colour (our blue replaces Substack's orange):**
  - Fills (primary buttons, the Post tab, avatar fallback, banner fallback) use `#002EC1` with `#E6E6E6` text. Hover fill `#1F4BE0`, pressed `#0021A0`. Wash for badges and active rows `#0B1A4A`.
  - Blue used as text, link, icon, line or outline on dark surfaces must be the lighter `#6C86FF`. The base blue has only 1.6 to 2.2 contrast against the dark surfaces and must never be used for text.
  - Yellow `#EFF710` in one place only: the new-activity dot on the avatar.
- **Shape:** `border-radius: 0` everywhere, including avatars and buttons. No shadows, gradients, glows or blur.
- **Fonts, two only, loaded with `next/font`:** Anton (stand-in for CS Antibes, swap once licensed) for the logo and large page titles only. Source Sans 3 (stand-in for Nebula Sans) for everything else. Noto Sans Telugu as the fallback for Telugu text. Never use `font-style: italic`.
- **Texture:** faint light film grain over the page (about 4 percent opacity, SVG noise with a screen blend, no library).
- **Icons:** `lucide-react`, outline style, stroke width 1.5, like Substack's thin line icons. 22px in the tab bar, 20px elsewhere. Inactive `#A8A8A8`, active `#E6E6E6`. One icon style only.
- **Copy:** sentence case, no em dashes, no hype verbs, no "Learn more". Buttons are plain verbs.
- **Motion:** functional only. Respect `prefers-reduced-motion`.
- **Libraries:** `lucide-react` is approved now. Lenis, GSAP and React Bits are approved for a later milestone. Do not install them in M0 to M2.

## Performance rules
- Cursor pagination (`created_at`, `id`) on every list. Never load everything.
- Index every filtered, joined or sorted column and every foreign key.
- Server-render the first page of the feed. Use `loading.tsx` and Suspense skeletons.
- Cache channel lists and public profiles, with tag-based revalidation after writes.
- Optimistic UI for like and follow.
- Use supabase-js (the HTTP API) for all data access. Only if direct Postgres access is ever needed, use the pooled connection string.
- Fixed image dimensions to avoid layout shift. Resize avatars and banners on upload.

## Security and RLS (non-negotiable)
RLS on every table.
- `profiles`, `profile_experience`, `featured_films`, `follows`, `categories`, `films`, `likes`: readable by everyone. Writes only by the owner (`auth.uid()` matches the owner column). `follows` insert requires `follower_id = auth.uid()` and `follower_id <> following_id`. `categories` has no client writes.
- `ai_reviews`: owner can read and insert only.
- `waitlist` and `events`: anyone can insert, nobody can read from the client.
- Storage buckets `avatars` and `banners`: public read, write only inside the folder named after the user's id, images only, 2 MB (avatars) and 4 MB (banners) limits.
- The Supabase secret key (`sb_secret_...`) and AI keys live only in server environment variables, and the secret key is used only if a task truly needs it (ask first). The browser uses the publishable key (`sb_publishable_...`), which is safe to expose because RLS guards the data. Every API route verifies the user and validates input.

## Data model
- `profiles`: id (= auth user id), username (unique, case-insensitive), display_name, headline, location, banner_url, avatar_url, bio, languages text[], skills text[], fav_dialogue (max 200), fav_dialogue_source, fav_filmmakers text[] (max 5), fav_genres text[] (max 5), links jsonb, follower_count, following_count, created_at
- `profile_experience`: id, profile_id, title, org_or_project, start_year, end_year (null = present), description, link
- `featured_films`: profile_id, film_id, position (max 3 per profile)
- `follows`: follower_id, following_id, created_at (primary key on the pair, index on both columns)
- `categories`: slug, name, sort_order. Seed: direction, writing, cinematography, editing, acting, music-and-sound, production, art-and-design, animation-and-vfx
- `films`: id, owner_id, title, caption, genre, language, duration_seconds (check 1 to 180), source_type ('youtube'), video_url, youtube_id, thumbnail_url, preview_start_seconds (default 0), category_slug (required, references categories), like_count, view_count, created_at. Index on (category_slug, created_at desc) and (created_at desc)
- `likes`: film_id, user_id (unique pair)
- `ai_reviews`: id, user_id, script_text, result jsonb, provider, created_at
- `waitlist`: id, email, feature ('festivals' or 'collaborate'), created_at
- `events`: id, user_id nullable, name, props jsonb, created_at
- Database triggers keep `follower_count`, `following_count` and `like_count` correct.

## AI provider rules (used from M3)
Primary Gemini, fallback Grok (xAI, OpenAI-compatible API). Fall back on a 20 second timeout, HTTP 429, 5xx, or output that fails schema validation after one retry with backoff. After 3 consecutive primary failures, skip it for 60 seconds. Same prompt and zod-validated JSON schema for both. Save `provider` on every review. Env vars: `GEMINI_API_KEY`, `XAI_API_KEY`. Never opt into any xAI data-sharing programme.

## Working agreements
- Show a short plan first and wait for approval.
- One milestone at a time. Do not start the next one.
- Small commits after each working feature.
- Ask before installing any dependency.
- Mobile first. Every screen has loading, empty and error states.
- Telugu text must display and save correctly (UTF-8).
- Finish with: what was built, what was not built, how to test it manually.

## Out of scope
Comments, votes, communities beyond channels, direct messages, connection requests, payments, producer accounts, festival pages beyond a coming-soon screen, AI video analysis, native app, the ASCII front page (later milestone).
