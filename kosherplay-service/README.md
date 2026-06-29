# KosherPlay Selenium service

A small Python/Flask service that drives **crm.kosherplay.com** (an Angular SPA
with no public API) through a persistent headless-Chrome session, and exposes a
tiny HTTP API the storefront's Supabase edge function (`kosherplay`) proxies to.

The browser logs in **once** and stays alive in memory for fast repeat calls.
Selenium isn't thread-safe, so every CRM operation runs under a single global
lock — **run exactly one worker**.

## Endpoints

All endpoints require the `X-KP-Secret` header (must equal `KP_SHARED_SECRET`).

| Method | Path | Body / Query | Result |
|---|---|---|---|
| GET | `/health` | — | `{ok:true}` |
| POST | `/api/action` | `{device, phone, action}` — action ∈ `suspend\|activate\|gp_open\|gp_block` | `{ok, msg}` |
| GET | `/api/code` | `?type=free\|chrome\|magen\|pc\|combined` | `{ok, code, msg}` |
| GET | `/api/balance` | — | `{balance}` |

## Environment

See [.env.example](.env.example): `KP_USER`, `KP_PWD`, `KP_SHARED_SECRET`.

## Deploy (Render / Railway / Fly.io)

This is a standard Docker service:

1. Point the platform at this `kosherplay-service/` directory (it has the
   `Dockerfile`). On Render: **New → Web Service → Docker**, root directory
   `kosherplay-service`.
2. Set the env vars (`KP_USER`, `KP_PWD`, `KP_SHARED_SECRET`).
3. Deploy. Note the public URL (e.g. `https://kosherplay-xxxx.onrender.com`).
4. On Supabase, set the `kosherplay` edge function secrets:
   - `KP_SERVICE_URL` = that public URL
   - `KP_SHARED_SECRET` = the same secret as above

> Memory: headless Chrome needs ~512MB+. Pick a plan with enough RAM.
> Single instance only — multiple instances each spawn their own browser/session.

## Local run

```bash
cd kosherplay-service
pip install -r requirements.txt
export KP_USER=... KP_PWD=... KP_SHARED_SECRET=dev
# needs a local Chrome + chromedriver, or run via the Dockerfile
python app.py
```
