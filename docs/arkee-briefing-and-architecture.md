# Arkee — Product Briefing & Technical Architecture

> **Document Version:** 1.0  
> **Status:** Active Reference  
> **Audience:** Developers, Technical Partners, and AI Assistants (ChatGPT / Claude / Antigravity)  
> **Repository:** `filmmaker-platform`

---

## 1. Executive Summary & Vision

**Arkee** is a minimalist, quiet media and portfolio platform built specifically for independent filmmakers, screenwriters, and creative artists. It combines the community feed structure of Reddit, the clean editorial reading experience of Substack, and the career/credits focus of LinkedIn.

### Core Value Proposition
- **Showcase Creative Works:** Publish microfilms (YouTube-hosted short films under 3 minutes), written pieces (screenplays, treatments, essays), and visual artwork/design sets.
- **Creator Identity & Credits:** Replace chaotic link-in-bio trees with an industry-grade creative profile highlighting crew roles, creative experience, film DNA (favourite directors, genres, dialogues), and featured work.
- **AI Screenplay Feedback:** On-demand, structured narrative analysis and script notes powered by AI (Gemini primary with Grok fallback).
- **Creative Collaboration & Distribution:** Dedicated channels to find crew collaborators and track film festival submission deadlines.

---

## 2. Target Audience & Current Scope

- **Phase 1 (Current):** Prototype and testing ground for a 20-person college film club test and investor pitch deck.
- **Product Owner:** Kartheek (decides all feature, visual, and architectural constraints).
- **Core Principle:** Functional, dark, fast, mobile-first. No vanity metrics, no noisy animations, zero rounded corners.

---

## 3. Product Features & Routes

| Route | Purpose | Key Behavior |
|---|---|---|
| `/` | **Home Feed** | Newest creative works across all channels, single-column feed, cursor pagination, muted auto-preview for microfilms. |
| `/popular` | **Popular Feed** | Most-liked creative works from the last 7 days. |
| `/explore` | **Discovery Feed** | Works from creators the signed-in user does not yet follow. |
| `/c/[slug]` | **Channel Feed** | Category-filtered feed (e.g., Direction, Cinematography, Writing). |
| `/f/[id]` | **Post / Film View** | Full detail page with media player/reader, view count, like button, author info, and comments section. |
| `/u/[username]` | **Public Profile** | Artist banner, avatar, headline, bio, Film DNA, experience timeline, skills, and featured work. |
| `/settings/profile` | **Profile Editor** | Update details, manage experience history, upload cropped avatar/banner images, and select featured films. |
| `/post` | **Create Post** | Multi-format creator (`video`, `writing`, `image`) with channel selector, YouTube validation, runtime check, and live card preview. |
| `/ai` | **AI Screenplay Review** | Script review tool offering narrative critique, pacing analysis, and scene breakdowns (*Milestone 3*). |
| `/festivals` | **Festival Hub** | Coming-soon waitlist collecting interest for film festival submission deadlines. |
| `/collaborate` | **Crew Collaboration** | Coming-soon waitlist for filmmakers seeking crew/collaborators. |
| `/admin` | **Admin Dashboard** | Protected moderation queue for reported posts, hiding flagged content, and restricting bad actors. |
| `/login` & `/onboarding` | **Authentication** | Google OAuth and email sign-in; first-time profile creation with unique handle check. |

---

## 4. Design System & Aesthetics

Arkee adheres to an intentional, brutalist, and distraction-free aesthetic:

- **Geometry:** `border-radius: 0` strictly everywhere (buttons, cards, avatars, badges, modals). No shadows, blurs, or glow effects.
- **Dark Palette (Zero Pure White):**
  - Base Background: Pure Black `#000000`
  - Content Surfaces: Dark Slate `#232525`
  - Hover Surface: `#2E3030`
  - Hairline Borders: `1px solid #303232`
- **Text Hierarchy:**
  - Primary: `#E6E6E6`
  - Secondary: `#A8A8A8`
  - Tertiary / Hints: `#878787`
- **Accents:**
  - **Arkee Electric Blue (`#002EC1`):** Primary button fills, active tabs. Hover `#1F4BE0`, pressed `#0021A0`.
  - **Light Accent Blue (`#6C86FF`):** Used exclusively for text links, outlines, icon highlights, and active borders on dark surfaces to guarantee accessibility contrast.
  - **Accent Wash (`#0B1A4A`):** Active sidebar row backgrounds and badge washes.
  - **Alert Yellow (`#EFF710`):** Single location only — new activity notification dot on the user avatar.
- **Typography (`next/font`):**
  - **Pixelify Sans:** Logo, brand marks, and technical badges.
  - **Archivo Black:** Display headlines.
  - **Zilla Slab:** Editorial titles, script text, and body copy.
  - *No italics are permitted.*
- **Texture:** Faint 4% opacity light film grain overlaid across the viewport using an SVG noise filter with a screen blend.
- **Icons:** `lucide-react`, outline style, stroke width 1.5 (22px in bottom nav, 20px elsewhere).
- **Layout:**
  - **Mobile:** Fixed top bar with hamburger drawer and avatar menu; single-column feed; fixed 4-tab bottom navigation (Festivals, Collaborate, Post, AI).
  - **Desktop:** Persistent 240px left sidebar and centered 680px feed column.

---

## 5. Technical Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│     Next.js 15 (App Router, React 19, TypeScript)           │
│     Tailwind CSS (Zero-radius, custom palette, SVG grain)   │
│     Lucide React (Stroke 1.5 outline icons)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       Next.js API & SSR      │    │     Supabase HTTP / SDK      │
│  - Session Refresh Middleware│    │  - Supabase Auth (OAuth/OTP) │
│  - Dynamic Metadata & SSR    │    │  - Postgres with RLS         │
│  - YouTube / Metadata helper │    │  - Storage (avatars/images)  │
└──────────────┬───────────────┘    └──────────────┬───────────────┘
               │                                   │
               ▼                                   ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│      External AI Layer       │    │     PostgreSQL Database      │
│  - Gemini API (Primary)      │    │  - 14 relational tables      │
│  - Grok / xAI (Fallback)     │    │  - Anti-tamper triggers      │
│  - Strict Zod schema output  │    │  - Security Definer RPCs     │
└──────────────────────────────┘    └──────────────────────────────┘
```

### Full Technology Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.
- **Database & Auth:** Supabase (PostgreSQL 15+, Supabase SSR Auth with cookie session management via `@supabase/ssr`).
- **Storage:** Supabase Storage (`avatars`, `banners`, `post-images` buckets with user folder isolation).
- **Styling:** Tailwind CSS with explicit design tokens and CSS variables.
- **Video Architecture:** YouTube IFrame Player API with intersection-based muted scroll preview (pointer events disabled, 10s clip loop, automatically destroyed off-screen).
- **Hosting & Deployment:** Vercel (production & preview branches) connected to GitHub.

---

## 6. Database Schema & Security Architecture

The database is built on PostgreSQL with strict Row Level Security (RLS) on every table and trigger-based anti-tamper mechanisms.

### Core Relational Models
1. **`profiles`:** User ID (`auth.uid()`), unique lowercase username, display name, headline, bio, location, languages, skills, banner/avatar URLs, Film DNA (`fav_dialogue`, `fav_filmmakers`, `fav_genres`), follower/following counters.
2. **`profile_experience`:** Professional portfolio credits (title, project/production company, start/end year, description, link).
3. **`categories`:** 9 predefined channels (`direction`, `writing`, `cinematography`, `editing`, `acting`, `music-and-sound`, `production`, `art-and-design`, `animation-and-vfx`).
4. **`films` (Posts):** Microfilms and multi-format creative works. Supports `post_type`: `'video' | 'writing' | 'image'`. Stores YouTube IDs, captions, body text, uploaded media URLs, category reference, like/view/comment counts, and moderation status (`is_hidden`, `hidden_reason`).
5. **`featured_films`:** Pinned works on artist profiles (maximum 3).
6. **`comments`:** Flat comment discussions on creative posts (max 1,000 characters).
7. **`likes` & `follows`:** Unique relational pairs for tracking engagement with optimistic UI updates.
8. **`reports` & `restrictions` & `admins`:** Full moderation sub-system. Tracks report reasons (`spam`, `abuse`, `off_topic`), admin status, and restricts banned users from creating content.
9. **`ai_reviews`:** User script text, structured JSON evaluation output, and provider tracking (`gemini` or `grok`).
10. **`waitlist`:** Captures interest for future festival and collaboration tools.

### Security & Integrity Highlights
- **Client Tamper Protection:** Authenticated or anon clients **cannot** increment or manipulate `like_count`, `comment_count`, `view_count`, `follower_count`, or `is_hidden` directly. PostgreSQL `BEFORE UPDATE` triggers throw exceptions if any client modifies protected counter columns.
- **Atomic Counters:** Database triggers automatically maintain like counts, follower counts, and comment counts when relational rows are inserted or deleted.
- **View RPC:** `increment_film_view` uses a PostgreSQL function with session-based view throttling.
- **Admin Moderation via RPCs:** Admin actions (hiding posts, dismissing reports, restricting accounts) are executed via `SECURITY DEFINER` RPCs (`admin_set_post_hidden`, `admin_dismiss_reports`, etc.) accessible only to verified admins in the `admins` table.
- **Strict Storage Limits:** Client-side canvas resizing before upload; Supabase storage policies restrict users to their own `uid/` subfolder (avatars: 2 MB, banners/post images: 4 MB).

---

## 7. Performance & Engineering Guidelines

- **Cursor Pagination:** All feeds and lists use cursor pagination based on `(created_at, id)`. Full table scans and arbitrary `OFFSET` paging are forbidden.
- **Database Indexing:** Compound indexes on `(category_slug, created_at desc)`, `(post_type, created_at desc)`, and foreign key pairs ensure millisecond query times.
- **Scroll Preview Engine:**
  - An Intersection Observer monitors cards in the feed.
  - A video triggers a muted 10-second preview only when **60% visible for at least 400ms**.
  - Exactly **one** YouTube player exists at any moment; previous players are unmounted immediately.
  - Respects user preferences: automatically disabled if `prefers-reduced-motion` is detected or network speed is constrained.
- **Server Rendering & Skeletons:** Feed pages are server-rendered for initial view, accompanied by hairline skeleton card placeholders for smooth suspense loading.

---

## 8. Development Roadmap

- **Milestone 0 (Done):** Foundations, Supabase schema, design tokens, app shell, responsive navigation, waitlist forms.
- **Milestone 1 (Done):** Auth (Google + Email), onboarding, profile pages, profile editor, experience credits, optimistic follow system.
- **Milestone 2 (Done):** Multi-format posting (`video`, `writing`, `image`), feeds (Home, Popular, Explore, Channels), YouTube scroll preview engine, comments, and admin report/restriction system.
- **Milestone 3 (Next):** AI Screenplay Review engine behind `lib/ai/review.ts` (Dual-provider: Gemini primary with Grok fallback, 20s timeout/429 circuit breaker, strict Zod schema validation).
- **Milestone 4 (Future):** ASCII art front page, pitch polish, seed content, and live demo hardening.

