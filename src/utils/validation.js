// Shared validation & formatting helpers.

// Keep only digits, capped at 10 — unless `bypass` (master admin) is set.
export const sanitizePhone = (v, bypass = false) =>
  bypass ? v : String(v ?? '').replace(/\D/g, '').slice(0, 10)

// Exactly 10 digits.
export const isValidPhone = (v) => /^\d{10}$/.test(String(v ?? ''))

export const isValidEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim())

// Standard Luhn checksum for credit-card structural validity.
export function luhnValid(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

// Build a tel: link (keeps digits and a leading +).
export const telLink = (phone) => `tel:${String(phone ?? '').replace(/[^\d+]/g, '')}`

// Build a wa.me link from a local IL number (05X… → 9725X…).
export const waFromLocal = (phone) => {
  const d = String(phone ?? '').replace(/\D/g, '')
  const intl = d.startsWith('0') ? `972${d.slice(1)}` : d
  return `https://wa.me/${intl}`
}
