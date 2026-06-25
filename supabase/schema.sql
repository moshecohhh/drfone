-- ===========================================================================
-- Dr Fone — Supabase schema, step 1: identities (profiles) + RLS.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is idempotent (safe to run more than once).
-- ===========================================================================

-- 1) Profile row for every auth user (auth.users holds the email + hashed
--    password; this holds everything else the app needs).
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  role        text not null default 'CUSTOMER'
              check (role in ('MASTER_ADMIN', 'STORE', 'CUSTOMER')),
  phone       text,
  address     text,
  newsletter  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Extra columns (added idempotently so re-running this file upgrades an
-- existing table). `email` is denormalised from auth.users so the admin user
-- list can show it; `saved_payments` keeps the (mock) saved cards.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists saved_payments jsonb not null default '[]'::jsonb;

alter table public.profiles enable row level security;

-- 2) Helper: is the *current* caller a master admin? SECURITY DEFINER so it can
--    read profiles without tripping the policies below (avoids recursion).
create or replace function public.is_master_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'MASTER_ADMIN'
  );
$$;

-- 3) Row Level Security policies.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  using (auth.uid() = id or public.is_master_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id or public.is_master_admin())
  with check (auth.uid() = id or public.is_master_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
  on public.profiles for delete
  using (public.is_master_admin());
-- (No INSERT policy: rows are created by the trigger below, not by clients.)

-- 4) Anti-escalation: a normal user may edit their own profile but may NOT
--    change their own role. Only a master admin (or the SQL editor, where
--    auth.uid() is null) can change roles.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_master_admin() then
    new.role := old.role; -- silently keep the existing role
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role_update on public.profiles;
create trigger guard_profile_role_update
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- 5) Auto-create a profile whenever someone signs up. New accounts are always
--    CUSTOMER (the column default); promotion to admin is a separate step.
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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
