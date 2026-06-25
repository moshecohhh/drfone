-- ===========================================================================
-- Dr Fone — Supabase schema, step 2: catalog (items + categories).
-- Shared across all visitors: the admin edits once, every customer sees it.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (profiles + public.is_master_admin()) to already exist.
-- ===========================================================================

-- 1) Items. `data` holds the full product/service object (name, brand,
--    category, price, oldPrice, stock, badge, description, emoji, image, deal,
--    barcode ...). Keeping it as jsonb means new fields never need a migration.
create table if not exists public.catalog_items (
  id          text primary key,
  domain      text not null check (domain in ('store', 'lab')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists catalog_items_domain_idx on public.catalog_items (domain);

-- 2) Categories (per domain, ordered).
create table if not exists public.catalog_categories (
  id          text primary key,
  domain      text not null check (domain in ('store', 'lab')),
  label       text not null,
  image       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists catalog_categories_domain_idx on public.catalog_categories (domain);

-- 3) RLS: everyone may READ the catalog; only the master admin may WRITE.
alter table public.catalog_items enable row level security;
alter table public.catalog_categories enable row level security;

drop policy if exists catalog_items_read on public.catalog_items;
create policy catalog_items_read on public.catalog_items
  for select using (true);

drop policy if exists catalog_items_write on public.catalog_items;
create policy catalog_items_write on public.catalog_items
  for all using (public.is_master_admin()) with check (public.is_master_admin());

drop policy if exists catalog_categories_read on public.catalog_categories;
create policy catalog_categories_read on public.catalog_categories
  for select using (true);

drop policy if exists catalog_categories_write on public.catalog_categories;
create policy catalog_categories_write on public.catalog_categories
  for all using (public.is_master_admin()) with check (public.is_master_admin());
