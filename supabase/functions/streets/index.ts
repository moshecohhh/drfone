// Supabase Edge Function: streets
// Returns Israeli street names for a given city, proxied from the official CBS
// "רחובות בישראל" dataset on data.gov.il. Done server-side so the browser isn't
// subject to the data.gov.il CORS / rate-limit quirks, and the storefront gets
// a real, up-to-date national street list scoped to the chosen city.
//
// Request body: { city: string, q?: string }
// Response:     { streets: string[] }

// CBS "streets in Israel" datastore resource on data.gov.il.
const RESOURCE_ID = '1b14e41c-85b3-4c21-bdce-9fe48185ffca'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    /* empty body → empty result */
  }
  const city = String(body.city ?? '').trim()
  const q = String(body.q ?? '').trim()
  if (!city) return json({ streets: [] })

  try {
    // `q` as a JSON object does a lenient per-field full-text search, which
    // tolerates the CBS city_name spacing/format (exact `filters` would not).
    const search = JSON.stringify(q ? { city_name: city, street_name: q } : { city_name: city })
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=120&q=${encodeURIComponent(search)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json().catch(() => ({}))
    const records = data?.result?.records ?? []
    const streets = [...new Set(records.map((r: Record<string, unknown>) => String(r.street_name ?? '').trim()).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'he'))
    return json({ streets })
  } catch (e) {
    return json({ streets: [], error: String(e) })
  }
})
