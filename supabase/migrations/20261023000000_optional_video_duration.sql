-- Migration: Make video duration optional while capping at 180 seconds if provided
-- IMPORTANT: Run this migration in the Supabase SQL Editor before deploying application code.

alter table public.films drop constraint if exists check_post_type_fields;
alter table public.films add constraint check_post_type_fields check (
  (post_type = 'video' and (duration_seconds is null or (duration_seconds >= 1 and duration_seconds <= 180)) and youtube_id is not null and video_url is not null and (source_type is null or source_type = 'youtube')) or
  (post_type = 'writing' and body is not null) or
  (post_type = 'image' and cardinality(media_urls) >= 1 and cardinality(media_urls) <= 4)
);
