-- Migration: Enforce that admin access is granted exclusively to 'kartheekakula'

-- 1. Remove all records from admins that do not belong to 'kartheekakula'
delete from public.admins
where user_id not in (
  select id from public.profiles where lower(username) = 'kartheekakula'
);

-- 2. Insert 'kartheekakula' into admins if the profile exists
insert into public.admins (user_id)
select id from public.profiles
where lower(username) = 'kartheekakula'
on conflict (user_id) do nothing;

-- 3. Update public.is_admin() helper to enforce that the authenticated user
-- must have a record in admins AND their profile username must be 'kartheekakula'
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.admins a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid()
      and lower(p.username) = 'kartheekakula'
  );
end;
$$ language plpgsql security definer stable;

