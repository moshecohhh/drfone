-- ===========================================================================
-- Dr Fone — profiles backfill. Run in Supabase: SQL Editor -> New query.
-- Ensures EVERY auth user has a profile row, so all registered customers show
-- up in the admin "לקוחות רשומים" list (some users may have been created before
-- the signup trigger existed, or via the dashboard, and have no profile row).
-- Idempotent — safe to run any time. Requires step 1 (profiles + trigger).
-- ===========================================================================

-- Make the signup trigger resilient: never abort/skip if a row already exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill a profile for every existing auth user that doesn't have one.
insert into public.profiles (id, name, email, phone)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', ''),
  u.email,
  coalesce(u.raw_user_meta_data->>'phone', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
