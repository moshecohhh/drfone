// Shared brand vocabulary. NOTE: brands are *defined* once here, but they are
// always filtered against a single domain's items at a time (see useCatalog).
// The list is shared; the filtering is strictly per-domain. No cross-contamination.

export const BRANDS = [
  { id: 'all', label: 'כל המותגים' },
  { id: 'samsung', label: 'Samsung' },
  { id: 'apple', label: 'Apple' },
  { id: 'xiaomi', label: 'Xiaomi' },
  { id: 'oneplus', label: 'OnePlus' },
  { id: 'qliux', label: 'Qliux' },
  { id: 'nokia', label: 'Nokia' },
]

// The virtual "all" reset filter (kept out of the editable brand registry).
export const ALL_BRAND = { id: 'all', label: 'כל המותגים' }

// Seed for the dynamic, admin-editable brand registry (each brand has a logo).
export const SEED_BRANDS = BRANDS.filter((b) => b.id !== 'all').map((b) => ({
  id: b.id,
  label: b.label,
  logo: '', // image URL / data-URL / inline SVG; empty -> monogram fallback
}))
