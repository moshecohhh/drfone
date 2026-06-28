-- ===========================================================================
-- Dr Fone — auth: capture the name from OAuth (Google) signups too.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- ===========================================================================

-- Google provides the display name under `full_name` (email/password signups
-- use `name`). Coalesce both so every new profile gets a name. on conflict keeps
-- it safe to re-run and resilient to a pre-existing row.
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
  on conflict (id) do nothing;
  return new;
end;
$$;
