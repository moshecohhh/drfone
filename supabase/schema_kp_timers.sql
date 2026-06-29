-- KosherPlay "temporary action" timers.
--
-- The `kosherplay` edge function does an action now and schedules the opposite
-- action for later. Scheduling is server-side (here), so the user can close the
-- browser / shut down — pg_cron fires the due actions.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.kp_timers (
  id uuid primary key default gen_random_uuid(),
  device text not null,
  phone text not null,
  t text not null,            -- 'sub' | 'gp'
  end_action text not null,   -- 'activate' | 'gp_block'
  run_at timestamptz not null,
  created_at timestamptz default now()
);

-- RLS on with no policies → only the service role (the edge function) may access.
alter table public.kp_timers enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every minute, ask the edge function to run any due end-actions.
-- Replace <PROJECT>, <ANON_KEY> and <KP_CRON_SECRET> with your values.
select cron.schedule('kp-process-due', '* * * * *', $CRON$
  select net.http_post(
    url := 'https://<PROJECT>.supabase.co/functions/v1/kosherplay',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer <ANON_KEY>',
      'apikey','<ANON_KEY>',
      'x-kp-cron','<KP_CRON_SECRET>'
    ),
    body := jsonb_build_object('op','process_due')
  );
$CRON$);
