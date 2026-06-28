-- ===========================================================================
-- Dr Fone — Supabase schema, step 7: reliable stock decrement + private costs.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (public.is_master_admin()) and step 2 (catalog_items).
-- ===========================================================================

-- 1) Stock decrement on checkout.
-- catalog_items is writable only by the master admin (RLS), so a customer's or
-- guest's checkout cannot lower stock directly. This SECURITY DEFINER function
-- performs the decrement with elevated rights, callable by anyone placing an
-- order. Never drops below zero; also keeps the derived `inStock` flag in sync.
create or replace function public.decrement_stock(p_id text, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur int;
  next int;
begin
  select coalesce((data->>'stock')::int, 0) into cur from public.catalog_items where id = p_id;
  if not found then return; end if;
  next := greatest(0, cur - greatest(0, coalesce(p_qty, 0)));
  update public.catalog_items
    set data = data || jsonb_build_object('stock', next, 'inStock', next > 0)
  where id = p_id;
end;
$$;
grant execute on function public.decrement_stock(text, int) to anon, authenticated;

-- 2) Private product costs (for profit tracking).
-- Kept in a SEPARATE table — NOT in catalog_items.data, which is world-readable
-- — so the cost is visible only to the master admin and never reaches a
-- customer through the public catalog.
create table if not exists public.product_costs (
  id          text primary key,
  cost        numeric not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.product_costs enable row level security;
drop policy if exists product_costs_admin on public.product_costs;
create policy product_costs_admin on public.product_costs
  for all using (public.is_master_admin()) with check (public.is_master_admin());
