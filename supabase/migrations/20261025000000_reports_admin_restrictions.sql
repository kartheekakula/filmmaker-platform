-- Migration: Reports, Admin Controls, Restrictions, and Counter Protection
-- IMPORTANT: Run this migration in the Supabase SQL Editor before deploying application code (Items C and D).

-- ====================================================================
-- 1. Close security holes: BEFORE UPDATE triggers on films & profiles
-- ====================================================================

-- Function: prevent signed-in clients from modifying counter & moderation columns on films
create or replace function public.prevent_film_protected_column_updates()
returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (NEW.like_count is distinct from OLD.like_count) or
       (NEW.comment_count is distinct from OLD.comment_count) or
       (NEW.view_count is distinct from OLD.view_count) or
       (NEW.is_hidden is distinct from OLD.is_hidden) or
       (NEW.hidden_reason is distinct from OLD.hidden_reason) then
      raise exception 'Cannot modify protected moderation or counter columns directly.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_film_protected_column_updates on public.films;
create trigger trg_prevent_film_protected_column_updates
  before update on public.films
  for each row execute function public.prevent_film_protected_column_updates();

-- Function: prevent signed-in clients from modifying follower/following counts on profiles
create or replace function public.prevent_profile_protected_column_updates()
returns trigger as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (NEW.follower_count is distinct from OLD.follower_count) or
       (NEW.following_count is distinct from OLD.following_count) then
      raise exception 'Cannot modify follower or following counts directly.';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_profile_protected_column_updates on public.profiles;
create trigger trg_prevent_profile_protected_column_updates
  before update on public.profiles
  for each row execute function public.prevent_profile_protected_column_updates();

-- ====================================================================
-- 2. Admins Table and is_admin() Helper
-- ====================================================================

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade
);

alter table public.admins enable row level security;

-- RLS: user can read only their own row. No client writes at all.
drop policy if exists "admins_select" on public.admins;
create policy "admins_select" on public.admins
  for select using (auth.uid() = user_id);

-- Helper function: is_admin()
create or replace function public.is_admin()
returns boolean as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1 from public.admins where user_id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

grant execute on function public.is_admin() to anon, authenticated;

-- ====================================================================
-- 3. Restrictions Table and is_restricted(uid) Helper
-- ====================================================================

create table if not exists public.restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.restrictions enable row level security;

-- RLS: admins can view restrictions, no client writes
drop policy if exists "restrictions_select" on public.restrictions;
create policy "restrictions_select" on public.restrictions
  for select using (public.is_admin());

-- Helper function: is_restricted(uid)
create or replace function public.is_restricted(uid uuid)
returns boolean as $$
begin
  if uid is null then
    return false;
  end if;
  return exists (
    select 1 from public.restrictions where user_id = uid
  );
end;
$$ language plpgsql security definer stable;

grant execute on function public.is_restricted(uuid) to anon, authenticated;

-- ====================================================================
-- 4. Films: Moderation Columns & Updated films_select Policy
-- ====================================================================

alter table public.films add column if not exists is_hidden boolean not null default false;
alter table public.films add column if not exists hidden_reason text;

alter table public.films drop constraint if exists check_films_hidden_reason;
alter table public.films add constraint check_films_hidden_reason
  check (hidden_reason in ('admin', 'account') or hidden_reason is null);

-- Replace films_select policy: readable if not hidden, owned by viewer, or viewer is admin
drop policy if exists "films_select" on public.films;
create policy "films_select" on public.films
  for select using (
    (not is_hidden)
    or (auth.uid() is not null and auth.uid() = owner_id)
    or public.is_admin()
  );

-- ====================================================================
-- 5. Reports Table, Indexes, and RLS
-- ====================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.films(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'off_topic', 'abuse', 'other')),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  constraint unique_film_reporter unique (film_id, reporter_id)
);

create index if not exists idx_reports_status_film on public.reports(status, film_id);
create index if not exists idx_reports_reporter on public.reports(reporter_id);

alter table public.reports enable row level security;

-- RLS on reports: insert only as yourself, not on own post, not if restricted
drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports
  for insert with check (
    auth.uid() = reporter_id
    and not public.is_restricted(auth.uid())
    and not exists (
      select 1 from public.films f where f.id = film_id and f.owner_id = auth.uid()
    )
  );

-- select: reporter can select their own rows, admins can select all
drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports
  for select using (
    (auth.uid() = reporter_id)
    or public.is_admin()
  );

-- ====================================================================
-- 6. Read-only Restrictions on Existing Insert Policies
-- ====================================================================

-- Films insert
drop policy if exists "films_insert" on public.films;
create policy "films_insert" on public.films
  for insert with check (
    auth.uid() = owner_id
    and not public.is_restricted(auth.uid())
  );

-- Comments insert
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (
    auth.uid() = author_id
    and not public.is_restricted(auth.uid())
  );

-- Likes insert
drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert with check (
    auth.uid() = user_id
    and not public.is_restricted(auth.uid())
  );

-- Follows insert
drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows
  for insert with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and not public.is_restricted(auth.uid())
  );

-- ====================================================================
-- 7. Admin RPC Functions (SECURITY DEFINER)
-- ====================================================================

-- 7.1 admin_set_post_hidden
create or replace function public.admin_set_post_hidden(p_film_id uuid, p_hidden boolean)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: caller is not an admin';
  end if;

  if p_hidden then
    update public.films
    set is_hidden = true, hidden_reason = 'admin'
    where id = p_film_id;

    update public.reports
    set status = 'actioned'
    where film_id = p_film_id and status = 'open';
  else
    update public.films
    set is_hidden = false, hidden_reason = null
    where id = p_film_id;
  end if;
end;
$$ language plpgsql security definer;

-- 7.2 admin_dismiss_reports
create or replace function public.admin_dismiss_reports(p_film_id uuid)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: caller is not an admin';
  end if;

  update public.reports
  set status = 'dismissed'
  where film_id = p_film_id and status = 'open';
end;
$$ language plpgsql security definer;

-- 7.3 admin_set_user_restricted
create or replace function public.admin_set_user_restricted(p_user_id uuid, p_restricted boolean)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: caller is not an admin';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot restrict self';
  end if;

  if exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'Cannot restrict an admin';
  end if;

  if p_restricted then
    insert into public.restrictions (user_id, created_by)
    values (p_user_id, auth.uid())
    on conflict (user_id) do nothing;

    update public.films
    set is_hidden = true, hidden_reason = 'account'
    where owner_id = p_user_id and is_hidden = false;
  else
    delete from public.restrictions
    where user_id = p_user_id;

    update public.films
    set is_hidden = false, hidden_reason = null
    where owner_id = p_user_id and hidden_reason = 'account';
  end if;
end;
$$ language plpgsql security definer;

-- 7.4 admin_delete_comment
create or replace function public.admin_delete_comment(p_comment_id uuid)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: caller is not an admin';
  end if;

  delete from public.comments
  where id = p_comment_id;
end;
$$ language plpgsql security definer;

-- 7.5 admin_report_queue
create or replace function public.admin_report_queue()
returns table (
  film_id uuid,
  title text,
  post_type text,
  thumbnail_url text,
  owner_id uuid,
  owner_username citext,
  report_count bigint,
  reason_counts jsonb,
  latest_report_at timestamptz
) as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: caller is not an admin';
  end if;

  return query
  select
    f.id as film_id,
    f.title,
    f.post_type,
    coalesce(
      f.thumbnail_url,
      case
        when f.youtube_id is not null then 'https://img.youtube.com/vi/' || f.youtube_id || '/hqdefault.jpg'
        when cardinality(f.media_urls) > 0 then f.media_urls[1]
        else null
      end
    ) as thumbnail_url,
    p.id as owner_id,
    p.username as owner_username,
    count(distinct r.reporter_id) as report_count,
    jsonb_build_object(
      'spam', count(r.id) filter (where r.reason = 'spam'),
      'off_topic', count(r.id) filter (where r.reason = 'off_topic'),
      'abuse', count(r.id) filter (where r.reason = 'abuse'),
      'other', count(r.id) filter (where r.reason = 'other')
    ) as reason_counts,
    max(r.created_at) as latest_report_at
  from public.reports r
  join public.films f on f.id = r.film_id
  join public.profiles p on p.id = f.owner_id
  where r.status = 'open'
  group by f.id, f.title, f.post_type, f.thumbnail_url, f.youtube_id, f.media_urls, p.id, p.username
  order by report_count desc, latest_report_at desc;
end;
$$ language plpgsql security definer;

-- Grants
grant execute on function public.admin_set_post_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_dismiss_reports(uuid) to authenticated;
grant execute on function public.admin_set_user_restricted(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_comment(uuid) to authenticated;
grant execute on function public.admin_report_queue() to authenticated;
