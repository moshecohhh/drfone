-- ===========================================================================
-- Dr Fone — Supabase schema, step 8: color-aware IMEI allocation on checkout.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 2 (catalog_items) and step 7 (decrement_stock).
-- ===========================================================================
--
-- For an IMEI-managed product each unit is stored in data->'imeis' as either a
-- legacy string "353..." or an object { "imei": "353...", "color": "#RRGGBB" }.
-- When an order is placed we must remove EXACTLY the units that match the color
-- the customer chose — never a unit of another color. catalog_items is writable
-- only by the master admin (RLS), so this SECURITY DEFINER function does the
-- atomic pop with elevated rights, callable by anyone placing an order.
--
-- Behaviour:
--   • Picks up to p_qty units whose color equals p_color.
--   • If p_color is '' / null, OR no unit carries any color yet (legacy,
--     untagged product), it picks any units — so older inventory still sells.
--   • Removes the picked units, keeps stock / inStock / imei1 / imei2 in sync,
--     and RETURNS the allocated units so the caller can record them on the order.
create or replace function public.allocate_imeis(p_id text, p_color text, p_qty int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw        jsonb;
  norm       jsonb;
  want       int := greatest(0, coalesce(p_qty, 0));
  any_tagged boolean;
  allocated  jsonb := '[]'::jsonb;
  remaining  jsonb := '[]'::jsonb;
  elem       jsonb;
  taken      int := 0;
  imei_txt   text;
  color_txt  text;
  match      boolean;
begin
  select data->'imeis' into raw from public.catalog_items where id = p_id for update;
  if raw is null or jsonb_typeof(raw) <> 'array' then
    return allocated;
  end if;

  -- Normalize every entry to { imei, color } and drop empties.
  norm := '[]'::jsonb;
  for elem in select * from jsonb_array_elements(raw) loop
    if jsonb_typeof(elem) = 'object' then
      imei_txt := coalesce(elem->>'imei', '');
      color_txt := coalesce(elem->>'color', '');
    else
      imei_txt := coalesce(trim(both '"' from elem::text), '');
      color_txt := '';
    end if;
    if length(trim(imei_txt)) > 0 then
      norm := norm || jsonb_build_array(jsonb_build_object('imei', imei_txt, 'color', color_txt));
    end if;
  end loop;

  -- If nothing is color-tagged, allocate by position regardless of p_color.
  any_tagged := exists (
    select 1 from jsonb_array_elements(norm) e where coalesce(e->>'color', '') <> ''
  );

  for elem in select * from jsonb_array_elements(norm) loop
    color_txt := coalesce(elem->>'color', '');
    match := (taken < want) and (
      coalesce(p_color, '') = '' or not any_tagged or color_txt = p_color
    );
    if match then
      allocated := allocated || jsonb_build_array(elem);
      taken := taken + 1;
    else
      remaining := remaining || jsonb_build_array(elem);
    end if;
  end loop;

  update public.catalog_items
    set data = data || jsonb_build_object(
      'imeis', remaining,
      'stock', jsonb_array_length(remaining),
      'inStock', jsonb_array_length(remaining) > 0,
      'imei1', coalesce(remaining->0->>'imei', ''),
      'imei2', coalesce(remaining->1->>'imei', '')
    )
  where id = p_id;

  return allocated;
end;
$$;
grant execute on function public.allocate_imeis(text, text, int) to anon, authenticated;
