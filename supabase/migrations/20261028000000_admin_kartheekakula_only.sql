-- Migration: Enforce that admin access is granted exclusively to 'kartheekakulaa'

-- 1. Remove all records from admins that do not belong to 'kartheekakulaa'
delete from public.admins
where user_id not in (
  select id from public.profiles where lower(username) = 'kartheekakulaa'
);

-- 2. Insert 'kartheekakulaa' into admins if the profile exists
insert into public.admins (user_id)
select id from public.profiles
where lower(username) = 'kartheekakulaa'
on conflict (user_id) do nothing;

-- 3. Update public.is_admin() helper to enforce that the authenticated user
-- must have a record in admins AND their profile username must be 'kartheekakulaa'
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.admins a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid()
      and lower(p.username) = 'kartheekakulaa'
  );
end;
$$ language plpgsql security definer stable;
