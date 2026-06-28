-- ===========================================================================
-- Dr Fone — Supabase schema, step 8: live carts (abandoned-cart visibility).
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (profiles + public.is_master_admin()).
-- ===========================================================================

-- A signed-in customer's current cart, mirrored from the client so the shop can
-- see who has items waiting. One row per customer (id = user id). Guests are not
-- tracked. `data` holds { items, subtotal, customer:{name,email,phone} }.
create table if not exists public.carts (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists carts_updated_idx on public.carts (updated_at desc);
alter table public.carts enable row level security;

-- The customer fully manages their own cart row.
drop policy if exists carts_own on public.carts;
create policy carts_own on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The master admin can read every cart (for the abandoned-carts view).
drop policy if exists carts_admin_read on public.carts;
create policy carts_admin_read on public.carts
  for select using (public.is_master_admin());
