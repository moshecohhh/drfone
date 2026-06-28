-- ===========================================================================
-- Dr Fone — make Google (OAuth) sign-ups appear in admin "משתמשים והרשאות".
-- Google supplies the display name under `full_name` (email signups use `name`),
-- and some accounts may have been created before the signup trigger existed, so
-- they have no profile row at all. This re-attaches the trigger, captures the
-- Google name, and backfills every missing/empty profile.
--
-- Run ONCE in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- ===========================================================================

-- 1) Signup trigger function: take the name from BOTH email (`name`) and Google
--    (`full_name`); on a pre-existing row, fill in a missing name/email.
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
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        name  = case when coalesce(public.profiles.name, '') = '' then excluded.name else public.profiles.name end;
  return new;
end;
$$;

-- 2) Make sure the trigger is actually attached to auth.users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Backfill a profile for every existing auth user that lacks one (Google too).
insert into public.profiles (id, name, email, phone)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'name', ''), u.raw_user_meta_data->>'full_name', ''),
  u.email,
  coalesce(u.raw_user_meta_data->>'phone', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 4) Fill in missing names / emails on existing profiles from the auth metadata.
update public.profiles p
set
  name = coalesce(nullif(p.name, ''), nullif(u.raw_user_meta_data->>'name', ''), u.raw_user_meta_data->>'full_name', ''),
  email = coalesce(p.email, u.email)
from auth.users u
where u.id = p.id
  and (coalesce(p.name, '') = '' or p.email is null);
