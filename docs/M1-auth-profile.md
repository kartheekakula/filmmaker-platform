# M1: Auth, LinkedIn-style profile, follow

Estimated effort: 10 to 14 hours. M0 must be finished and merged.

## Before you start
Set up Google sign-in in Supabase Auth (create OAuth credentials in Google Cloud and add the redirect URLs for local and Vercel).

## Prompt

> Read AGENTS.md. M0 is done. We are building M1 only. Show a plan first and ask me about anything unclear.
>
> **1. Auth.** Sign in with Google and with email, a `/login` page, log out, and route protection. Signed-out visitors can browse the feed and view profiles. Following, liking and posting redirect to `/login` first.
>
> **2. Onboarding (`/onboarding`).** Shown once after first sign-in: display name, username (unique, case-insensitive, with live availability check), headline, location, languages. Create the profile row from this flow.
>
> **3. Profile menu.** Tapping the top-right avatar opens a menu with View profile, Edit profile and Log out. Show the new-activity yellow dot placeholder logic only as a prop for now.
>
> **4. Public profile (`/u/[username]`).** Single column on mobile (max 760px on desktop), hairline-bordered sections in this order:
> - Header: banner (uploaded image, or a flat `#002EC1` block), square avatar overlapping the banner, display name, headline, location and languages, follower and following counts, and a blue "Follow" button (replaced by "Edit profile" on your own profile).
> - Fav dialogue as a quiet pinned quote with a 2px left border in `#6C86FF`, if set.
> - About: bio, then Film DNA chips (favourite filmmakers and genres).
> - Featured: up to three films in a row (empty state for now).
> - Activity: latest five films (empty state for now).
> - Experience: creative work entries (title, project or organisation, years, description). This works for any creative discipline.
> - Skills: chips.
>
> **5. Edit profile (`/settings/profile`).** Every field above, including adding, editing, reordering and removing experience entries. Avatar (2 MB) and banner (4 MB) upload to the storage buckets, images only, resized before upload.
>
> **6. Follow and unfollow** with optimistic UI. Counts come from the database triggers.
>
> **7. RLS check.** Users can edit only their own rows and files.
>
> Do not build films, the feed, channels, posting or AI. Do not install Lenis, GSAP or React Bits.
>
> At the end: what was built, what was not, and a manual test that uses two accounts, including follow, unfollow, and trying to edit the other account's profile.

## Done when
- Both sign-in methods work locally and on Vercel.
- Onboarding creates a profile with a unique username.
- Profile page shows every section in order, with empty states.
- Follow counts update correctly for both accounts.
- Account A cannot change anything on account B.
