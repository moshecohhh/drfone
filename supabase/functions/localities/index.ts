// Supabase Edge Function: localities
// Returns the full list of Israeli localities (cities, moshavim, kibbutzim,
// settlements…) from the official CBS dataset on data.gov.il — every distinct
// city_name in the national streets dataset. Proxied server-side so the browser
// isn't subject to data.gov.il CORS/rate-limit quirks. The client caches the
// result, so the city picker shows the complete list with no per-use latency.
//
// Response: { localities: string[] }

const RESOURCE_ID = '1b14e41c-85b3-4c21-bdce-9fe48185ffca' // CBS "רחובות בישראל"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    // distinct city_name across the whole dataset → every locality that has
    // streets (cities, moshavim, kibbutzim…). ~1,300 entries, one small payload.
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}` +
      `&fields=city_name&distinct=true&limit=5000`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json().catch(() => ({}))
    const records = data?.result?.records ?? []
    const localities = [...new Set(records.map((r: Record<string, unknown>) => String(r.city_name ?? '').trim()).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), 'he'))
    return json({ localities })
  } catch (e) {
    return json({ localities: [], error: String(e) })
  }
})
