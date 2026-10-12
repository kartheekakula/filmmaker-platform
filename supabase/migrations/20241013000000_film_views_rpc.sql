-- ====================================================================
-- Milestone 2: Film View RPC Function
-- Enables safe increment of film views without granting direct update
-- ====================================================================

create or replace function public.increment_film_view(p_film_id uuid)
returns void as $$
begin
  update public.films
  set view_count = view_count + 1
  where id = p_film_id;
end;
$$ language plpgsql security definer;

-- Allow anon and authenticated users to increment view count
grant execute on function public.increment_film_view(uuid) to anon, authenticated;
