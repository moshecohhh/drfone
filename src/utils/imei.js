// Per-unit IMEI helpers.
//
// An IMEI entry on a product may be stored either as a plain string (legacy
// builds) or as an object { imei, color } once a unit is tied to a specific
// color. Tagging each unit with its color means that when a sale drops a unit
// from the serial inventory we still know which color was sold — otherwise the
// remaining stock-by-color is ambiguous. These helpers normalize both shapes
// so callers never have to care which one they got.

// Extract the raw IMEI string from an entry (string or { imei }).
export const imeiOf = (e) => String((e && typeof e === 'object' ? e.imei : e) ?? '')

// Extract the linked color hex from an entry ('' when none / legacy string).
export const colorOf = (e) => (e && typeof e === 'object' ? e.color || '' : '')

// Normalize one entry to the { imei, color } shape.
export const normImei = (e) => ({ imei: imeiOf(e), color: colorOf(e) })

// Normalize a whole list, keeping the color link, with the IMEI reduced to its
// digits and entries that hold no real number dropped.
export const cleanImeiList = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((e) => ({ imei: imeiOf(e).replace(/\D/g, ''), color: colorOf(e) }))
    .filter((e) => e.imei)

// Count the units that carry a real IMEI.
export const imeiCountOf = (arr) =>
  (Array.isArray(arr) ? arr : []).filter((e) => imeiOf(e).trim()).length

// Map of color hex -> number of in-stock units carrying that color. Units with
// no color land under the '' key. Only entries with a real IMEI are counted.
export const imeiCountByColor = (arr) => {
  const m = {}
  ;(Array.isArray(arr) ? arr : []).forEach((e) => {
    if (!imeiOf(e).trim()) return
    const c = colorOf(e)
    m[c] = (m[c] || 0) + 1
  })
  return m
}

// How many units are available to sell in a specific color.
// Once ANY unit has been color-tagged we trust the tags: a color only has the
// units explicitly assigned to it (so a black-only product can't fulfil a pink
// order). For a legacy product where NO unit is tagged yet, we fall back to the
// total count so existing inventory stays sellable until it's tagged.
export const imeiStockForColor = (arr, color) => {
  const list = (Array.isArray(arr) ? arr : []).filter((e) => imeiOf(e).trim())
  const anyTagged = list.some((e) => colorOf(e))
  if (!anyTagged) return list.length
  return list.filter((e) => colorOf(e) === (color || '')).length
}
