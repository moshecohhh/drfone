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
