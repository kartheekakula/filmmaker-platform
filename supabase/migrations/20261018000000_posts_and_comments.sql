-- Migration: Support non-video posts (writing, image) and comments
-- Run this migration in the Supabase SQL Editor before deploying application code.

-- 1. Alter films table for multi-format posts
alter table public.films drop constraint if exists films_duration_seconds_check;
alter table public.films drop constraint if exists films_source_type_check;

alter table public.films alter column youtube_id drop not null;
alter table public.films alter column video_url drop not null;
alter table public.films alter column duration_seconds drop not null;
alter table public.films alter column source_type drop not null;
alter table public.films alter column source_type drop default;

alter table public.films add column if not exists post_type text not null default 'video';
alter table public.films add column if not exists body text;
alter table public.films add column if not exists media_urls text[] not null default '{}'::text[];
alter table public.films add column if not exists comment_count integer not null default 0;

alter table public.films drop constraint if exists check_films_comment_count;
alter table public.films add constraint check_films_comment_count check (comment_count >= 0);

alter table public.films drop constraint if exists check_post_type;
alter table public.films add constraint check_post_type check (post_type in ('video', 'writing', 'image'));

alter table public.films drop constraint if exists check_post_type_fields;
alter table public.films add constraint check_post_type_fields check (
  (post_type = 'video' and duration_seconds is not null and duration_seconds >= 1 and duration_seconds <= 180 and youtube_id is not null and video_url is not null and (source_type is null or source_type = 'youtube')) or
  (post_type = 'writing' and body is not null) or
  (post_type = 'image' and cardinality(media_urls) >= 1 and cardinality(media_urls) <= 4)
);

create index if not exists idx_films_post_type on public.films(post_type, created_at desc);

-- 2. Comments Table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_film_created on public.comments(film_id, created_at desc);
create index if not exists idx_comments_author on public.comments(author_id);

alter table public.comments enable row level security;

-- Comments RLS Policies
create policy "comments_select" on public.comments
  for select using (true);

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = author_id);

create policy "comments_delete" on public.comments
  for delete using (auth.uid() = author_id);

-- Trigger to maintain comment_count on films table
create or replace function public.handle_comment_counts()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.films set comment_count = comment_count + 1 where id = NEW.film_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.films set comment_count = greatest(0, comment_count - 1) where id = OLD.film_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.handle_comment_counts();

-- 3. Storage bucket for post-images (max 4 MB, public read, user-isolated write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images', 'post-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "post_images_public_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_images_user_insert" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_images_user_update" on storage.objects
  for update using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_images_user_delete" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
