-- NOTE: Run this migration by hand in the Supabase SQL editor before deploying Collaborate and Festivals code.
-- Migration: Collaborate Requests, Applications, Saves, Festivals and Admin Controls
-- Timestamp: 20261103000000

-- ====================================================================
-- 1. Helper function for skills validation (Immutable)
-- ====================================================================

create or replace function public.validate_collab_skills(skills text[])
returns boolean
language plpgsql
immutable
as $$
declare
  s text;
begin
  if skills is null then
    return true;
  end if;
  if cardinality(skills) > 5 then
    return false;
  end if;
  foreach s in array skills loop
    if s is null or char_length(trim(s)) < 1 or char_length(s) > 24 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- ====================================================================
-- 2. Collab Requests Table, Indexes, Constraints and Triggers
-- ====================================================================

create table if not exists public.collab_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) >= 3 and char_length(title) <= 80),
  role_slug text not null references public.categories(slug),
  body text not null check (char_length(body) >= 10 and char_length(body) <= 600),
  work_mode text not null check (work_mode in ('remote', 'in_person', 'hybrid')),
  city text check (char_length(city) <= 40),
  pay_type text not null default 'unpaid' check (pay_type in ('paid', 'unpaid')),
  pay_note text check (char_length(pay_note) <= 40),
  duration_text text check (char_length(duration_text) <= 24),
  skills text[] default '{}',
  apply_by date,
  status text not null default 'open' check (status in ('open', 'closed')),
  is_hidden boolean not null default false,
  applicant_count integer not null default 0 check (applicant_count >= 0)
);

-- Ensure table constraints exist idempotently
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collab_requests_city_check') then
    alter table public.collab_requests add constraint collab_requests_city_check check (
      (work_mode = 'remote') or (city is not null and char_length(trim(city)) > 0)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'collab_requests_skills_check') then
    alter table public.collab_requests add constraint collab_requests_skills_check check (
      public.validate_collab_skills(skills)
    );
  end if;
end $$;

-- Indexes
create index if not exists idx_collab_requests_status_created on public.collab_requests(status, created_at desc, id desc);
create index if not exists idx_collab_requests_role_created on public.collab_requests(role_slug, created_at desc);
create index if not exists idx_collab_requests_owner on public.collab_requests(owner_id);

-- RLS
alter table public.collab_requests enable row level security;

drop policy if exists "collab_requests_select" on public.collab_requests;
create policy "collab_requests_select" on public.collab_requests
  for select using (
    not is_hidden
    or auth.uid() = owner_id
    or public.is_admin()
  );

drop policy if exists "collab_requests_insert" on public.collab_requests;
create policy "collab_requests_insert" on public.collab_requests
  for insert with check (
    auth.uid() = owner_id
    and not public.is_restricted(auth.uid())
  );

drop policy if exists "collab_requests_update" on public.collab_requests;
create policy "collab_requests_update" on public.collab_requests
  for update using (
    auth.uid() = owner_id
    or public.is_admin()
  ) with check (
    auth.uid() = owner_id
    or public.is_admin()
  );

drop policy if exists "collab_requests_delete" on public.collab_requests;
create policy "collab_requests_delete" on public.collab_requests
  for delete using (
    auth.uid() = owner_id
    or public.is_admin()
  );

-- Trigger: 3 open requests limit per user
create or replace function public.check_collab_request_limit()
returns trigger
language plpgsql
as $$
declare
  open_count integer;
begin
  select count(*) into open_count
  from public.collab_requests
  where owner_id = new.owner_id
    and status = 'open';

  if open_count >= 3 then
    raise exception 'You can have at most 3 open collaboration requests at a time.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_collab_request_limit on public.collab_requests;
create trigger tr_collab_request_limit
  before insert on public.collab_requests
  for each row execute function public.check_collab_request_limit();

-- Trigger: prevent modifying protected columns directly by client
create or replace function public.prevent_collab_request_protected_column_updates()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (new.owner_id is distinct from old.owner_id) or
       (new.created_at is distinct from old.created_at) or
       (new.applicant_count is distinct from old.applicant_count) or
       (new.is_hidden is distinct from old.is_hidden) then
      raise exception 'Cannot modify protected collab request columns directly.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_collab_request_protected_column_updates on public.collab_requests;
create trigger trg_prevent_collab_request_protected_column_updates
  before update on public.collab_requests
  for each row execute function public.prevent_collab_request_protected_column_updates();

-- ====================================================================
-- 3. Collab Applications Table, Indexes and Triggers
-- ====================================================================

create table if not exists public.collab_applications (
  collab_id uuid not null references public.collab_requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  primary key (collab_id, applicant_id)
);

create index if not exists idx_collab_applications_applicant on public.collab_applications(applicant_id);

alter table public.collab_applications enable row level security;

drop policy if exists "collab_applications_insert" on public.collab_applications;
create policy "collab_applications_insert" on public.collab_applications
  for insert with check (
    auth.uid() = applicant_id
    and not public.is_restricted(auth.uid())
    and exists (
      select 1 from public.collab_requests r
      where r.id = collab_id
        and r.owner_id != auth.uid()
        and r.status = 'open'
        and not r.is_hidden
        and (r.apply_by is null or r.apply_by >= (now() at time zone 'Asia/Kolkata')::date)
    )
  );

drop policy if exists "collab_applications_select" on public.collab_applications;
create policy "collab_applications_select" on public.collab_applications
  for select using (
    auth.uid() = applicant_id
    or exists (
      select 1 from public.collab_requests r
      where r.id = collab_id
        and r.owner_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "collab_applications_delete" on public.collab_applications;
create policy "collab_applications_delete" on public.collab_applications
  for delete using (auth.uid() = applicant_id);

-- Trigger: keep collab_requests.applicant_count updated (SECURITY DEFINER)
create or replace function public.handle_collab_application_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    update public.collab_requests
    set applicant_count = applicant_count + 1
    where id = new.collab_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.collab_requests
    set applicant_count = greatest(0, applicant_count - 1)
    where id = old.collab_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_collab_application_count on public.collab_applications;
create trigger trg_collab_application_count
  after insert or delete on public.collab_applications
  for each row execute function public.handle_collab_application_count();

-- ====================================================================
-- 4. Collab Saves & Festival Saves Tables
-- ====================================================================

create table if not exists public.collab_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  collab_id uuid not null references public.collab_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, collab_id)
);

alter table public.collab_saves enable row level security;

drop policy if exists "collab_saves_select" on public.collab_saves;
create policy "collab_saves_select" on public.collab_saves
  for select using (auth.uid() = user_id);

drop policy if exists "collab_saves_insert" on public.collab_saves;
create policy "collab_saves_insert" on public.collab_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "collab_saves_delete" on public.collab_saves;
create policy "collab_saves_delete" on public.collab_saves
  for delete using (auth.uid() = user_id);

-- ====================================================================
-- 5. Festival Tags Validation Helper & Festivals Table
-- ====================================================================

create or replace function public.validate_festival_tags(tags text[])
returns boolean
language plpgsql
immutable
as $$
declare
  t text;
begin
  if tags is null then
    return true;
  end if;
  if cardinality(tags) > 5 then
    return false;
  end if;
  foreach t in array tags loop
    if t is null or char_length(trim(t)) < 1 or char_length(t) > 24 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) >= 3 and char_length(name) <= 100),
  organiser text not null check (char_length(organiser) <= 60),
  kind text not null check (kind in ('festival', 'screening', 'workshop')),
  work_mode text not null check (work_mode in ('online', 'in_person', 'hybrid')),
  city text check (char_length(city) <= 40),
  starts_on date not null,
  ends_on date not null,
  submit_by date,
  fee_text text check (char_length(fee_text) <= 30),
  student_friendly boolean not null default false,
  description text check (char_length(description) <= 600),
  tags text[] default '{}',
  website_url text not null check (website_url ~* '^https://'),
  submit_url text check (submit_url is null or submit_url ~* '^https://'),
  is_published boolean not null default true
);

-- Ensure table constraints exist idempotently
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'festivals_city_check') then
    alter table public.festivals add constraint festivals_city_check check (
      (work_mode = 'online') or (city is not null and char_length(trim(city)) > 0)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'festivals_dates_check') then
    alter table public.festivals add constraint festivals_dates_check check (ends_on >= starts_on);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'festivals_tags_check') then
    alter table public.festivals add constraint festivals_tags_check check (public.validate_festival_tags(tags));
  end if;
end $$;

create index if not exists idx_festivals_published_submit on public.festivals(is_published, submit_by);
create index if not exists idx_festivals_published_starts on public.festivals(is_published, starts_on);

alter table public.festivals enable row level security;

drop policy if exists "festivals_select" on public.festivals;
create policy "festivals_select" on public.festivals
  for select using (is_published or public.is_admin());

drop policy if exists "festivals_insert" on public.festivals;
create policy "festivals_insert" on public.festivals
  for insert with check (public.is_admin());

drop policy if exists "festivals_update" on public.festivals;
create policy "festivals_update" on public.festivals
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "festivals_delete" on public.festivals;
create policy "festivals_delete" on public.festivals
  for delete using (public.is_admin());

-- Festival saves table (references festivals)
create table if not exists public.festival_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  festival_id uuid not null references public.festivals(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, festival_id)
);

alter table public.festival_saves enable row level security;

drop policy if exists "festival_saves_select" on public.festival_saves;
create policy "festival_saves_select" on public.festival_saves
  for select using (auth.uid() = user_id);

drop policy if exists "festival_saves_insert" on public.festival_saves;
create policy "festival_saves_insert" on public.festival_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "festival_saves_delete" on public.festival_saves;
create policy "festival_saves_delete" on public.festival_saves
  for delete using (auth.uid() = user_id);

-- ====================================================================
-- 6. Functions (SECURITY INVOKER and ADMIN RPCS)
-- ====================================================================

-- Function: list_collabs (SECURITY INVOKER)
create or replace function public.list_collabs(
  p_search text default null,
  p_role_slug text default null,
  p_work_mode text default null,
  p_saved_only boolean default false,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 10
)
returns table (
  id uuid,
  owner_id uuid,
  created_at timestamptz,
  title text,
  role_slug text,
  body text,
  work_mode text,
  city text,
  pay_type text,
  pay_note text,
  duration_text text,
  skills text[],
  apply_by date,
  status text,
  is_hidden boolean,
  applicant_count integer,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text,
  is_saved boolean,
  has_applied boolean
)
language plpgsql
security invoker
as $$
declare
  v_escaped_search text;
  v_today date;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  v_today := (now() at time zone 'Asia/Kolkata')::date;

  if p_search is not null and length(trim(p_search)) > 0 then
    v_escaped_search := trim(p_search);
    v_escaped_search := replace(v_escaped_search, '\', '\\');
    v_escaped_search := replace(v_escaped_search, '%', '\%');
    v_escaped_search := replace(v_escaped_search, '_', '\_');
    v_escaped_search := '%' || v_escaped_search || '%';
  end if;

  return query
  select
    r.id,
    r.owner_id,
    r.created_at,
    r.title,
    r.role_slug,
    r.body,
    r.work_mode,
    r.city,
    r.pay_type,
    r.pay_note,
    r.duration_text,
    r.skills,
    r.apply_by,
    r.status,
    r.is_hidden,
    r.applicant_count,
    p.username::text as owner_username,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url,
    case
      when v_user_id is not null then
        exists(select 1 from public.collab_saves s where s.collab_id = r.id and s.user_id = v_user_id)
      else false
    end as is_saved,
    case
      when v_user_id is not null then
        exists(select 1 from public.collab_applications a where a.collab_id = r.id and a.applicant_id = v_user_id)
      else false
    end as has_applied
  from public.collab_requests r
  join public.profiles p on p.id = r.owner_id
  where r.status = 'open'
    and (r.apply_by is null or r.apply_by >= v_today)
    and (p_role_slug is null or p_role_slug = '' or r.role_slug = p_role_slug)
    and (p_work_mode is null or p_work_mode = '' or r.work_mode = p_work_mode)
    and (
      not p_saved_only
      or (v_user_id is not null and exists(select 1 from public.collab_saves s where s.collab_id = r.id and s.user_id = v_user_id))
    )
    and (
      v_escaped_search is null
      or r.title ilike v_escaped_search escape '\'
      or r.body ilike v_escaped_search escape '\'
      or p.display_name ilike v_escaped_search escape '\'
      or exists(select 1 from unnest(r.skills) sk where sk ilike v_escaped_search escape '\')
    )
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (r.created_at, r.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by r.created_at desc, r.id desc
  limit greatest(1, least(p_limit, 50));
end;
$$;

-- Function: list_festivals (SECURITY INVOKER)
-- Note: Offset pagination is used here because the festivals table is admin-curated and small.
create or replace function public.list_festivals(
  p_search text default null,
  p_kind text default null,
  p_work_mode text default null,
  p_tab text default 'open',
  p_saved_only boolean default false,
  p_offset integer default 0,
  p_limit integer default 20
)
returns table (
  id uuid,
  created_at timestamptz,
  name text,
  organiser text,
  kind text,
  work_mode text,
  city text,
  starts_on date,
  ends_on date,
  submit_by date,
  fee_text text,
  student_friendly boolean,
  description text,
  tags text[],
  website_url text,
  submit_url text,
  is_published boolean,
  is_saved boolean,
  total_count bigint
)
language plpgsql
security invoker
as $$
declare
  v_escaped_search text;
  v_today date;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  v_today := (now() at time zone 'Asia/Kolkata')::date;

  if p_search is not null and length(trim(p_search)) > 0 then
    v_escaped_search := trim(p_search);
    v_escaped_search := replace(v_escaped_search, '\', '\\');
    v_escaped_search := replace(v_escaped_search, '%', '\%');
    v_escaped_search := replace(v_escaped_search, '_', '\_');
    v_escaped_search := '%' || v_escaped_search || '%';
  end if;

  return query
  with filtered as (
    select
      f.id,
      f.created_at,
      f.name,
      f.organiser,
      f.kind,
      f.work_mode,
      f.city,
      f.starts_on,
      f.ends_on,
      f.submit_by,
      f.fee_text,
      f.student_friendly,
      f.description,
      f.tags,
      f.website_url,
      f.submit_url,
      f.is_published,
      case
        when v_user_id is not null then
          exists(select 1 from public.festival_saves s where s.festival_id = f.id and s.user_id = v_user_id)
        else false
      end as is_saved
    from public.festivals f
    where (p_kind is null or p_kind = '' or f.kind = p_kind)
      and (p_work_mode is null or p_work_mode = '' or f.work_mode = p_work_mode)
      and (
        not p_saved_only
        or (v_user_id is not null and exists(select 1 from public.festival_saves s where s.festival_id = f.id and s.user_id = v_user_id))
      )
      and (
        v_escaped_search is null
        or f.name ilike v_escaped_search escape '\'
        or f.organiser ilike v_escaped_search escape '\'
        or f.description ilike v_escaped_search escape '\'
        or (f.city is not null and f.city ilike v_escaped_search escape '\')
        or exists(select 1 from unnest(f.tags) tg where tg ilike v_escaped_search escape '\')
      )
      and (
        case p_tab
          when 'upcoming' then
            f.starts_on >= v_today
          when 'past' then
            f.ends_on < v_today
          else -- 'open'
            ((f.submit_by is not null and f.submit_by >= v_today) or (f.submit_by is null and f.starts_on >= v_today))
        end
      )
  ),
  counted as (
    select count(*) as c from filtered
  )
  select
    fl.id,
    fl.created_at,
    fl.name,
    fl.organiser,
    fl.kind,
    fl.work_mode,
    fl.city,
    fl.starts_on,
    fl.ends_on,
    fl.submit_by,
    fl.fee_text,
    fl.student_friendly,
    fl.description,
    fl.tags,
    fl.website_url,
    fl.submit_url,
    fl.is_published,
    fl.is_saved,
    cnt.c as total_count
  from filtered fl
  cross join counted cnt
  order by
    case when p_tab = 'upcoming' then fl.starts_on end asc,
    case when p_tab = 'past' then fl.ends_on end desc,
    case when p_tab = 'past' then fl.starts_on end desc,
    case when p_tab not in ('upcoming', 'past') then coalesce(fl.submit_by, fl.starts_on) end asc,
    case when p_tab not in ('upcoming', 'past') then fl.starts_on end asc,
    fl.id desc
  offset greatest(0, p_offset)
  limit greatest(1, least(p_limit, 50));
end;
$$;

-- Function: admin_set_collab_hidden (SECURITY DEFINER)
create or replace function public.admin_set_collab_hidden(
  p_id uuid,
  p_hidden boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: caller is not an administrator.';
  end if;

  update public.collab_requests
  set is_hidden = p_hidden
  where id = p_id;
end;
$$;
