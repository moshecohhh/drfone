-- ===========================================================================
-- Dr Fone — Supabase schema, step 3: orders.
-- Anyone (incl. guests) may PLACE an order; only the master admin can read all
-- of them and manage their status. A logged-in customer can read their own.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (public.is_master_admin()).
-- ===========================================================================

create table if not exists public.orders (
  id          text primary key,
  number      text,
  status      text not null default 'new',
  user_id     uuid references auth.users (id) on delete set null,
  data        jsonb not null default '{}'::jsonb, -- customer, payment, delivery, items, total, log
  created_at  timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Place an order: allowed for everyone, but you may only stamp it with your own
-- id (or leave it null as a guest) — no spoofing another user's id.
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert with check (user_id is null or user_id = auth.uid());

-- Read: master admin sees all; a customer sees only their own orders.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (public.is_master_admin() or user_id = auth.uid());

-- Manage (status, notes, delete): master admin only.
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update using (public.is_master_admin()) with check (public.is_master_admin());

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
  for delete using (public.is_master_admin());

-- Public order tracking: a guest (or anyone) can fetch a SINGLE order's
-- non-sensitive status by presenting its secret per-order token (emailed to the
-- customer). SECURITY DEFINER bypasses RLS but only ever returns the one row
-- whose token matches — and never the customer's personal details.
create or replace function public.get_order_by_token(p_token text)
returns table (number text, status text, created_at timestamptz, items jsonb, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select o.number,
         o.status,
         o.created_at,
         coalesce(o.data->'items', '[]'::jsonb) as items,
         coalesce((o.data->>'total')::numeric, 0) as total
  from public.orders o
  where length(p_token) >= 16
    and o.data->>'trackToken' = p_token
  limit 1;
$$;

grant execute on function public.get_order_by_token(text) to anon, authenticated;
