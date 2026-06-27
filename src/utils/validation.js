// Shared validation & formatting helpers.

// Keep only digits, capped at 10 — unless `bypass` (master admin) is set.
// Browser autofill often supplies Israeli numbers in international form
// (+972 / 972 / 00972, sometimes with a redundant extra 0). We convert that
// prefix to the local leading 0 so the value fits the 10-digit "05…" rule and
// the customer never has to edit it by hand.
export const sanitizePhone = (v, bypass = false) => {
  if (bypass) return v
  const digits = String(v ?? '').replace(/\D/g, '')
  return digits.replace(/^(?:00)?9720?/, '0').slice(0, 10)
}

// Exactly 10 digits.
export const isValidPhone = (v) => /^\d{10}$/.test(String(v ?? ''))

// Israeli MOBILE number: must start with 05 and be exactly 10 digits.
export const isValidMobileIL = (v) => /^05\d{8}$/.test(String(v ?? '').replace(/\D/g, ''))

// Contact phone — more lenient: an Israeli mobile/landline (10-digit 0XX… or
// 9-digit 0X… for some landlines) OR an international number (+ and 8-15 digits).
export const isValidContactPhone = (v) => {
  const raw = String(v ?? '').trim()
  if (!raw) return false
  if (raw.startsWith('+')) return /^\+\d{8,15}$/.test(raw.replace(/[\s-]/g, ''))
  const d = raw.replace(/\D/g, '')
  return /^0\d{8,9}$/.test(d) // local IL: leading 0 + 8–9 more digits
}

// A reasonable allow-list of top-level domains, so obvious typos like ".con"
// or ".cpm" are rejected. Covers the common global + Israeli TLDs.
const KNOWN_TLDS = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'co', 'io', 'me', 'info', 'biz',
  'app', 'dev', 'online', 'site', 'store', 'shop', 'tech', 'xyz', 'club',
  'live', 'life', 'email', 'name', 'pro', 'cloud', 'ai',
  'il', 'uk', 'us', 'de', 'fr', 'es', 'it', 'nl', 'ru', 'ca', 'au', 'jp',
  'cn', 'in', 'br', 'ch', 'se', 'no', 'fi', 'dk', 'pl', 'cz', 'gr', 'pt',
  'ro', 'tr', 'ua', 'be', 'at', 'ie', 'nz', 'mx', 'ar', 'cl', 'za',
])

// Common email-provider misspellings → the intended host.
const PROVIDER_TYPOS = {
  gmial: 'gmail', gmai: 'gmail', gmal: 'gmail', gmali: 'gmail', gnail: 'gmail',
  gmaill: 'gmail', gumail: 'gmail', gimail: 'gmail', gmial: 'gmail', gemail: 'gmail',
  hotmial: 'hotmail', hotmai: 'hotmail', hotmal: 'hotmail',
  yaho: 'yahoo', yahooo: 'yahoo', yahho: 'yahoo',
  outlok: 'outlook', outloook: 'outlook', wallla: 'walla', wala: 'walla',
}

// Returns a Hebrew problem string if the email looks wrong, or null if it's OK.
// Catches non-English characters, bad structure, unknown TLDs (e.g. ".con") and
// common provider typos.
export function emailIssue(v) {
  const s = String(v ?? '').trim()
  if (!s) return 'יש להזין כתובת אימייל.'
  // Email must be plain ASCII — Hebrew (or any non-English) characters are invalid.
  if (/[^\x20-\x7E]/.test(s)) return 'כתובת האימייל יכולה לכלול אותיות באנגלית ומספרים בלבד.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'כתובת האימייל אינה תקינה.'
  const domain = s.split('@')[1].toLowerCase()
  const labels = domain.split('.')
  const tld = labels[labels.length - 1]
  if (!KNOWN_TLDS.has(tld)) return 'סיומת כתובת האימייל אינה תקינה.'
  const host = labels.slice(0, -1).join('.')
  if (PROVIDER_TYPOS[host]) return `האם התכוונת ל-${PROVIDER_TYPOS[host]}.${tld}?`
  return null
}

export const isValidEmail = (v) => emailIssue(v) === null

// A name field must hold at least 2 letters and contain no digits.
export function nameIssue(v) {
  const s = String(v ?? '').trim()
  if (!s) return 'שדה חובה.'
  if (/\d/.test(s)) return 'השם אינו יכול לכלול מספרים.'
  if ((s.match(/\p{L}/gu) || []).length < 2) return 'יש להזין לפחות 2 אותיות.'
  return null
}

// Passwords that are too easy to guess. We block the truly trivial ones
// (sequences, all-identical, well-known passwords) but still permit merely weak
// ones such as "767676".
const TRIVIAL_PASSWORDS = new Set([
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345',
  '111111', '000000', '666666', '121212', '123123', '654321', '112233',
  'password', 'qwerty', 'qwerty123', 'abc123', 'iloveyou', 'admin', 'welcome',
  'aaaaaa', 'qazwsx', 'asdfgh', 'zxcvbn', '147258', '159753',
])

// True when every consecutive char steps by exactly +1 (or exactly −1).
function isSequential(s) {
  if (s.length < 4) return false
  let inc = true
  let dec = true
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1)
    if (d !== 1) inc = false
    if (d !== -1) dec = false
  }
  return inc || dec
}

// Returns a Hebrew problem string if the password is too weak to allow, else null.
export function passwordIssue(pw) {
  const s = String(pw ?? '')
  if (s.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים.'
  if (TRIVIAL_PASSWORDS.has(s.toLowerCase())) return 'הסיסמה נפוצה מדי — בחרו סיסמה אחרת.'
  if (/^(.)\1+$/.test(s)) return 'הסיסמה פשוטה מדי (תו אחד שחוזר).'
  if (isSequential(s)) return 'הסיסמה פשוטה מדי (רצף תווים).'
  return null
}

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
