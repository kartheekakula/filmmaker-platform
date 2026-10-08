-- ====================================================================
-- Milestone 0 Initial Schema Migration
-- Film Platform Data Model, Constraints, Indexes, Triggers, and RLS
-- ====================================================================

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- 2. Categories
create table if not exists public.categories (
  slug text primary key,
  name text not null,
  sort_order integer not null default 0
);

-- Seed Categories
insert into public.categories (slug, name, sort_order) values
  ('direction', 'Direction', 1),
  ('writing', 'Writing', 2),
  ('cinematography', 'Cinematography', 3),
  ('editing', 'Editing', 4),
  ('acting', 'Acting', 5),
  ('music-and-sound', 'Music & Sound', 6),
  ('production', 'Production', 7),
  ('art-and-design', 'Art & Design', 8),
  ('animation-and-vfx', 'Animation & VFX', 9)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

-- 3. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  display_name text not null default '',
  headline text,
  location text,
  banner_url text,
  avatar_url text,
  bio text,
  languages text[] not null default '{}'::text[],
  skills text[] not null default '{}'::text[],
  fav_dialogue text check (length(fav_dialogue) <= 200),
  fav_dialogue_source text,
  fav_filmmakers text[] check (cardinality(fav_filmmakers) <= 5),
  fav_genres text[] check (cardinality(fav_genres) <= 5),
  links jsonb not null default '{}'::jsonb,
  follower_count integer not null default 0 check (follower_count >= 0),
  following_count integer not null default 0 check (following_count >= 0),
  created_at timestamptz not null default now()
);

-- 4. Profile Experience
create table if not exists public.profile_experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  org_or_project text not null,
  start_year integer not null,
  end_year integer,
  description text,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists idx_profile_experience_profile on public.profile_experience(profile_id);

-- 5. Films
create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  caption text,
  genre text,
  language text,
  duration_seconds integer not null check (duration_seconds >= 1 and duration_seconds <= 180),
  source_type text not null default 'youtube' check (source_type = 'youtube'),
  video_url text not null,
  youtube_id text not null,
  thumbnail_url text,
  preview_start_seconds integer not null default 0,
  category_slug text not null references public.categories(slug),
  like_count integer not null default 0 check (like_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_films_category_created on public.films(category_slug, created_at desc);
create index if not exists idx_films_created on public.films(created_at desc);
create index if not exists idx_films_owner on public.films(owner_id);

-- 6. Featured Films
create table if not exists public.featured_films (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  film_id uuid not null references public.films(id) on delete cascade,
  position integer not null check (position >= 1 and position <= 3),
  primary key (profile_id, film_id),
  constraint unique_profile_position unique (profile_id, position)
);
create index if not exists idx_featured_films_film on public.featured_films(film_id);

-- 7. Follows
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);

-- 8. Likes
create table if not exists public.likes (
  film_id uuid not null references public.films(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (film_id, user_id)
);
create index if not exists idx_likes_user on public.likes(user_id);

-- 9. AI Reviews
create table if not exists public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  script_text text not null,
  result jsonb not null,
  provider text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_reviews_user on public.ai_reviews(user_id, created_at desc);

-- 10. Waitlist
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  feature text not null check (feature in ('festivals', 'collaborate')),
  created_at timestamptz not null default now()
);
create index if not exists idx_waitlist_feature_email on public.waitlist(feature, email);

-- 11. Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_user_created on public.events(user_id, created_at desc);

-- ====================================================================
-- TRIGGERS: Follower, Following, and Like counts
-- ====================================================================

-- Function & Trigger: Follow counts
create or replace function public.handle_follow_counts()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
    update public.profiles set follower_count = follower_count + 1 where id = NEW.following_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = OLD.follower_id;
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = OLD.following_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.handle_follow_counts();

-- Function & Trigger: Like counts
create or replace function public.handle_like_counts()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.films set like_count = like_count + 1 where id = NEW.film_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.films set like_count = greatest(0, like_count - 1) where id = OLD.film_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.handle_like_counts();

-- Function & Trigger: Create Profile on Auth User Signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
begin
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 5)
  );

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    raw_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on ALL tables
alter table public.profiles enable row level security;
alter table public.profile_experience enable row level security;
alter table public.featured_films enable row level security;
alter table public.follows enable row level security;
alter table public.categories enable row level security;
alter table public.films enable row level security;
alter table public.likes enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.waitlist enable row level security;
alter table public.events enable row level security;

-- 1. Profiles: readable by everyone, write only by owner
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_delete" on public.profiles
  for delete using (auth.uid() = id);

-- 2. Profile Experience: readable by everyone, write only by owner
create policy "profile_experience_select" on public.profile_experience
  for select using (true);

create policy "profile_experience_insert" on public.profile_experience
  for insert with check (auth.uid() = profile_id);

create policy "profile_experience_update" on public.profile_experience
  for update using (auth.uid() = profile_id);

create policy "profile_experience_delete" on public.profile_experience
  for delete using (auth.uid() = profile_id);

-- 3. Featured Films: readable by everyone, write only by owner
create policy "featured_films_select" on public.featured_films
  for select using (true);

create policy "featured_films_insert" on public.featured_films
  for insert with check (auth.uid() = profile_id);

create policy "featured_films_update" on public.featured_films
  for update using (auth.uid() = profile_id);

create policy "featured_films_delete" on public.featured_films
  for delete using (auth.uid() = profile_id);

-- 4. Follows: readable by everyone, insert by follower, delete by follower
create policy "follows_select" on public.follows
  for select using (true);

create policy "follows_insert" on public.follows
  for insert with check (auth.uid() = follower_id and follower_id <> following_id);

create policy "follows_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- 5. Categories: readable by everyone, no client writes
create policy "categories_select" on public.categories
  for select using (true);

-- 6. Films: readable by everyone, write only by owner
create policy "films_select" on public.films
  for select using (true);

create policy "films_insert" on public.films
  for insert with check (auth.uid() = owner_id);

create policy "films_update" on public.films
  for update using (auth.uid() = owner_id);

create policy "films_delete" on public.films
  for delete using (auth.uid() = owner_id);

-- 7. Likes: readable by everyone, insert/delete by owner
create policy "likes_select" on public.likes
  for select using (true);

create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- 8. AI Reviews: owner can read and insert only
create policy "ai_reviews_select" on public.ai_reviews
  for select using (auth.uid() = user_id);

create policy "ai_reviews_insert" on public.ai_reviews
  for insert with check (auth.uid() = user_id);

-- 9. Waitlist: anyone can insert, nobody can read from client
create policy "waitlist_insert" on public.waitlist
  for insert with check (true);

-- 10. Events: anyone can insert, nobody can read from client
create policy "events_insert" on public.events
  for insert with check (true);

-- ====================================================================
-- STORAGE BUCKETS AND POLICIES
-- ====================================================================

-- Create buckets for avatars (2MB) and banners (4MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('banners', 'banners', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage object policies:
-- Public read for avatars and banners
create policy "storage_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'banners'));

-- Write only inside folder named after auth.uid()
create policy "storage_user_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_user_update" on storage.objects
  for update using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_user_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
