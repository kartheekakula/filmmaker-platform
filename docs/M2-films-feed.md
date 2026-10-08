# M2: Films, channels, feed, scroll preview

Estimated effort: 14 to 18 hours. M1 must be finished and merged. The scroll preview is the riskiest part for lag, so test it with 50 films.

## Prompt

> Read AGENTS.md. M0 and M1 are done. We are building M2 only. Show a plan first.
>
> **1. Post a film (`/post`).** Login required. A form with: YouTube link (validate and extract the video ID), title, caption (max 160 characters), genre, language, duration in mm:ss (must be 3:00 or less), one required channel picked from the category list (posting is blocked without it), thumbnail (default to the YouTube thumbnail), and an optional "preview start" in seconds. Show a live preview card before posting.
>
> **2. Home feed (`/`).** A Reddit-style single column. Each card: creator row (square avatar, name, channel, time), title, 16:9 poster with a runtime badge, caption below, footer with genre, language and likes. Newest first, cursor pagination, infinite scroll, server-rendered first page, skeleton loading.
>
> **3. Channels.** `/c/[slug]` shows only films in that channel and the title shows the channel name. The drawer marks the active channel. `/popular` shows the most-liked films of the last 7 days across all channels. `/explore` shows recent films from creators the signed-in user does not follow (all recent films when signed out). Same card and pagination as the home feed.
>
> **4. Film page (`/f/[id]`).** YouTube player, title, caption, creator block with Follow button, channel link, like button, view count.
>
> **5. Scroll preview.** When a card is at least 60 percent in view for 400 ms, play a muted 10 second preview from `preview_start_seconds` over the poster, with the caption staying visible below. Rules:
> - Only one preview at a time. Create the YouTube player only for the active card and destroy it when it leaves the view.
> - Use the YouTube IFrame Player API with muted autoplay and start and end parameters.
> - The iframe has `pointer-events: none`, with a transparent link overlay on top that opens the film page.
> - Disable previews when reduced motion or data saver is on, or the connection is slow. Show the poster only.
> - A 3px progress line in `#6C86FF` along the bottom of the poster shows the 10 seconds, with a small "Preview" tag at the top left.
>
> **6. Likes and views.** Like with optimistic UI. Count one view per film per session.
>
> **7. Profile integration.** On the edit profile page, let the owner pick up to three of their films as Featured. Show them in the Featured section and show the latest five films in Activity.
>
> Do not build AI feedback, comments, votes or the front page. Do not install Lenis, GSAP or React Bits.
>
> At the end: what was built, what was not, a manual test checklist, and a note on how scrolling performs with 50 films in the feed.

## Done when
- A film can be posted only with a channel, and appears in the right channel feed, Popular and Explore as defined.
- The home feed scrolls smoothly with 50 films and only one preview plays at a time.
- Previews stop when a card leaves the screen, and are off with reduced motion.
- Like counts and Featured/Activity on profiles are correct.
