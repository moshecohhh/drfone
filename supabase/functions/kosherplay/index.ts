// Supabase Edge Function: kosherplay
// Pure-HTTP integration with the KosherPlay CRM REST API (crm.kosherplay.com).
// No browser / Selenium — the Angular app's own JSON API is called directly, so
// this runs entirely on Supabase (like the ideali features). Credentials live in
// this function's secrets and never reach the browser.
//
// Required secrets: KP_USER, KP_PWD
//   Timer scheduling (optional): KP_CRON_SECRET (guards the cron-only op),
//   plus a `kp_timers` table + a pg_cron job calling op:"process_due".
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Request body: { op, ... }
//   { op:'action', device, phone, action }   action ∈ suspend|activate|gp_open|gp_block
//   { op:'code', type }                       type ∈ free|chrome|magen|pc|combined
//   { op:'balance' }
//   { op:'timer_start', device, phone, t, duration_ms }   t ∈ sub|gp
//   { op:'timer_list' } | { op:'timer_finish', id } | { op:'process_due' }(cron)

const CRM = 'https://crm.kosherplay.com'
const KP_USER = Deno.env.get('KP_USER') ?? ''
const KP_PWD = Deno.env.get('KP_PWD') ?? ''
const KP_CRON_SECRET = Deno.env.get('KP_CRON_SECRET') ?? ''
const SB_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// Field deltas applied to the customer object for each action (reverse-engineered
// from the CRM's own save payloads). send_sms / fcm_status are the device-push
// command flags the SPA sets.
const STATUS: Record<string, Record<string, number>> = {
  suspend: { active: 2, send_sms: -1, fcm_status: 0 },
  activate: { active: 1, send_sms: 1, fcm_status: 0 },
  gp_open: { send_sms: 1, fcm_status: 1 },
  gp_block: { send_sms: -1, fcm_status: 0 },
}
const CODE_TYPE: Record<string, number> = { magen: 1, chrome: 2, combined: 3, free: 4, pc: 5 }
const TIMER: Record<string, { now: string; end: string }> = {
  sub: { now: 'suspend', end: 'activate' },
  gp: { now: 'gp_open', end: 'gp_block' },
}

// --- CRM auth (token cached in the warm instance, re-login on 401) ----------
let token = ''
async function login(): Promise<void> {
  const r = await fetch(`${CRM}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: KP_USER, password: KP_PWD }),
  })
  const d = await r.json().catch(() => ({}))
  token = d?.accessToken ?? ''
  if (!token) throw new Error('CRM login failed')
}
async function crm(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  if (!token) await login()
  const res = await fetch(`${CRM}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 && retry) { await login(); return crm(path, init, false) }
  return res
}

// --- CRM operations --------------------------------------------------------
async function getBalance() {
  const r = await crm('/api/custom/credits/balance')
  const d = await r.json().catch(() => ({}))
  return { balance: d?.amount ?? null }
}
async function genCode(typeKey: string) {
  const n = CODE_TYPE[typeKey]
  if (!n) return { ok: false, msg: 'סוג קוד לא תקין' }
  const r = await crm(`/api/custom/credits/promocode/generate?type=${n}`)
  const d = await r.json().catch(() => ({}))
  const code = d?.promocode != null ? String(d.promocode) : ''
  return code ? { ok: true, code } : { ok: false, msg: d?.message || 'יצירת הקוד נכשלה (אולי אין מספיק קרדיטים)' }
}
async function doAction(device: string, phone: string, action: string) {
  const delta = STATUS[action]
  if (!delta) return { ok: false, msg: 'פעולה לא תקינה' }
  const cr = await crm(`/api/custom/confirm/user/${encodeURIComponent(device)}/${encodeURIComponent(phone)}`)
  const cd = await cr.json().catch(() => ({}))
  const id = cd?.id
  if (!id) return { ok: false, msg: 'לקוח לא נמצא (בדקו מזהה/טלפון)' }
  const gr = await crm(`/api/data/1/${id}`)
  const gj = await gr.json().catch(() => null)
  const obj = Array.isArray(gj) ? gj[0] : (gj?.data ?? gj)
  if (!obj || typeof obj !== 'object') return { ok: false, msg: 'טעינת הלקוח נכשלה' }
  const body = { ...obj, ...delta }
  const pr = await crm(`/api/data/1/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!pr.ok) return { ok: false, msg: `שמירה נכשלה (${pr.status})` }
  const labels: Record<string, string> = {
    suspend: 'המנוי הושהה', activate: 'המנוי הופעל',
    gp_open: 'גוגל פליי נפתח ל-24 שעות', gp_block: 'גוגל פליי נחסם',
  }
  return { ok: true, msg: labels[action] }
}

// --- timers (DB-backed, fired by pg_cron) ----------------------------------
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}
const toMs = (ts: string) => Date.parse(ts)
async function timerStart(device: string, phone: string, t: string, durationMs: number) {
  const map = TIMER[t]
  if (!map) return { ok: false, msg: 'סוג טיימר לא תקין' }
  const now = await doAction(device, phone, map.now) // the immediate action
  const runAt = new Date(Date.now() + durationMs).toISOString()
  const r = await db('kp_timers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ device, phone, t, end_action: map.end, run_at: runAt }),
  })
  const rows = await r.json().catch(() => [])
  const row = Array.isArray(rows) ? rows[0] : rows
  return { ok: !!now?.ok, msg: now?.msg || '', timer: row ? { id: row.id, device, phone, t, run_at_ms: toMs(row.run_at) } : null }
}
async function timerList() {
  const r = await db('kp_timers?select=id,device,phone,t,run_at&order=run_at.asc')
  const rows = await r.json().catch(() => [])
  return { timers: (Array.isArray(rows) ? rows : []).map((x: Record<string, unknown>) => ({ id: x.id, device: x.device, phone: x.phone, t: x.t, run_at_ms: toMs(String(x.run_at)) })) }
}
async function timerFinish(id: string) {
  const r = await db(`kp_timers?id=eq.${encodeURIComponent(id)}&select=*`)
  const rows = await r.json().catch(() => [])
  const row = Array.isArray(rows) ? rows[0] : null
  if (!row) return { ok: false, msg: 'טיימר לא נמצא' }
  await db(`kp_timers?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
  const res = await doAction(row.device, row.phone, row.end_action)
  return { ok: !!res?.ok, msg: `סיום ידני — ${res?.msg || ''}` }
}
async function processDue() {
  const nowIso = new Date().toISOString()
  const r = await db(`kp_timers?run_at=lte.${encodeURIComponent(nowIso)}&select=*`)
  const due = await r.json().catch(() => [])
  let done = 0
  for (const row of (Array.isArray(due) ? due : [])) {
    await db(`kp_timers?id=eq.${row.id}`, { method: 'DELETE' })
    try { await doAction(row.device, row.phone, row.end_action); done++ } catch { /* ignore one failure */ }
  }
  return { ok: true, processed: done }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!KP_USER || !KP_PWD) return json({ ok: false, msg: 'KosherPlay credentials not configured' }, 500)

  const b = await req.json().catch(() => ({} as Record<string, unknown>))
  const op = String(b.op ?? '')
  try {
    if (op === 'balance') return json(await getBalance())
    if (op === 'code') return json(await genCode(String(b.type ?? '')))
    if (op === 'action') return json(await doAction(String(b.device ?? '').trim(), String(b.phone ?? '').trim(), String(b.action ?? '')))
    if (op === 'timer_start') return json(await timerStart(String(b.device ?? '').trim(), String(b.phone ?? '').trim(), String(b.t ?? ''), Number(b.duration_ms) || 0))
    if (op === 'timer_list') return json(await timerList())
    if (op === 'timer_finish') return json(await timerFinish(String(b.id ?? '')))
    if (op === 'process_due') {
      if (KP_CRON_SECRET && req.headers.get('x-kp-cron') !== KP_CRON_SECRET) return json({ ok: false }, 401)
      return json(await processDue())
    }
    return json({ ok: false, msg: 'unknown op' }, 400)
  } catch (e) {
    return json({ ok: false, msg: `שגיאה: ${String(e)}` }, 500)
  }
})
