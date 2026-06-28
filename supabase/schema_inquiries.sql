-- ===========================================================================
-- Dr Fone — Supabase schema, step 6: service tickets (two-way inquiries).
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Idempotent.
-- Requires step 4 (inquiries table + public.is_master_admin()).
-- ===========================================================================

-- Tie an inquiry to the customer who opened it (when logged in), so they can
-- read their own ticket + the shop's replies from their account. The full
-- conversation lives in data.messages [{ id, from:'customer'|'shop', text, at }]
-- with data.status 'open' | 'answered'.
alter table public.inquiries add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists inquiries_user_idx on public.inquiries (user_id);

-- A signed-in customer can read their own tickets (admin read stays via the
-- existing inquiries_select policy — multiple SELECT policies are OR'd).
drop policy if exists inquiries_select_own on public.inquiries;
create policy inquiries_select_own on public.inquiries
  for select using (auth.uid() is not null and auth.uid() = user_id);

-- ...and append a follow-up message to their own ticket (update their own row).
drop policy if exists inquiries_update_own on public.inquiries;
create policy inquiries_update_own on public.inquiries
  for update using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);
