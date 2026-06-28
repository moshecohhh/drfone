-- ===========================================================================
-- Dr Fone — Supabase schema, step 5: discount coupons.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 1 (profiles + public.is_master_admin()).
-- ===========================================================================

-- Coupons. The full definition lives in `data` jsonb:
--   { percent, active, scope: 'all'|'categories'|'products',
--     categoryIds: [], productIds: [],
--     singleUse,            -- general coupon: usable once in total
--     customerEmail,        -- compensation coupon: restricted to this email
--     oneTime }             -- compensation coupon: usable once (vs. permanent)
-- `used_count` tracks redemptions (for single-use / one-time enforcement).
create table if not exists public.coupons (
  id          text primary key,
  code        text unique not null,
  data        jsonb not null default '{}'::jsonb,
  used_count  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.coupons enable row level security;

-- Only the master admin can read the raw table (to manage coupons). Customers
-- never read it directly — they validate a code through the function below, so
-- coupon codes and per-customer assignments aren't publicly listable.
drop policy if exists coupons_admin on public.coupons;
create policy coupons_admin on public.coupons
  for all using (public.is_master_admin()) with check (public.is_master_admin());

-- Validate a coupon code for a given customer email. SECURITY DEFINER so a
-- customer (or guest) can check ONE code without read access to the table.
-- Returns { ok, reason? , code, percent, scope, categoryIds, productIds }.
create or replace function public.validate_coupon(p_code text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.coupons;
  d jsonb;
  cust text;
begin
  select * into c from public.coupons where lower(code) = lower(trim(p_code)) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  d := coalesce(c.data, '{}'::jsonb);

  if coalesce((d->>'active')::boolean, true) = false then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  cust := nullif(trim(coalesce(d->>'customerEmail', '')), '');
  if cust is not null and lower(cust) <> lower(coalesce(trim(p_email), '')) then
    return jsonb_build_object('ok', false, 'reason', 'wrong_customer');
  end if;

  -- Usage limits: a compensation one-time coupon, or a single-use general one,
  -- may only be redeemed once.
  if (cust is not null and coalesce((d->>'oneTime')::boolean, false) and c.used_count >= 1)
     or (cust is null and coalesce((d->>'singleUse')::boolean, false) and c.used_count >= 1) then
    return jsonb_build_object('ok', false, 'reason', 'used');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', c.code,
    'percent', coalesce((d->>'percent')::numeric, 0),
    'scope', coalesce(d->>'scope', 'all'),
    'categoryIds', coalesce(d->'categoryIds', '[]'::jsonb),
    'productIds', coalesce(d->'productIds', '[]'::jsonb)
  );
end;
$$;
grant execute on function public.validate_coupon(text, text) to anon, authenticated;

-- Redeem a coupon (increment the usage counter). SECURITY DEFINER, best-effort,
-- called once an order that used the coupon is placed.
create or replace function public.redeem_coupon(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set used_count = used_count + 1
  where lower(code) = lower(trim(p_code));
$$;
grant execute on function public.redeem_coupon(text) to anon, authenticated;
