-- ===========================================================================
-- Dr Fone — Supabase schema, step 4: app state, lab state, inquiries.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (profiles + public.is_master_admin()).
-- ===========================================================================

-- Helper: master admin OR lab staff (the STORE role works the Repairs module).
create or replace function public.is_staff_or_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('MASTER_ADMIN', 'STORE')
  );
$$;

-- 1) Public app state — storefront brands + settings (name, contact, payment/
--    delivery methods, ads, home content). Each app collection is one row whose
--    `value` is its JSON. Public READ; only the master admin WRITES.
create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.app_state enable row level security;
drop policy if exists app_state_read on public.app_state;
create policy app_state_read on public.app_state for select using (true);
drop policy if exists app_state_write on public.app_state;
create policy app_state_write on public.app_state
  for all using (public.is_master_admin()) with check (public.is_master_admin());

-- 2) Lab back-office state — customers, device registry, loaners, repairs,
--    statuses, custom fields. Master admin OR staff only, read AND write.
create table if not exists public.lab_state (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.lab_state enable row level security;
drop policy if exists lab_state_rw on public.lab_state;
create policy lab_state_rw on public.lab_state
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- 3) Contact-form inquiries — anyone may submit; only the master admin reads /
--    manages them (they contain other people's contact details).
create table if not exists public.inquiries (
  id          text primary key,
  read        boolean not null default false,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
alter table public.inquiries enable row level security;
drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert on public.inquiries for insert with check (true);
drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select on public.inquiries for select using (public.is_master_admin());
drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update on public.inquiries
  for update using (public.is_master_admin()) with check (public.is_master_admin());
drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete on public.inquiries for delete using (public.is_master_admin());
