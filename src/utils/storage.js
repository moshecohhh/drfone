// localStorage that never throws.
//
// Large values (base64 product/ad images especially) can blow past the ~5MB
// quota. A raw localStorage.setItem() that throws inside a React effect takes
// down the WHOLE app (blank/white page) — and it "works in incognito" only
// because private storage starts empty. Swallowing the write keeps the app
// alive: the in-memory state still works for the session, the data just isn't
// persisted. Reads are also guarded for private-mode edge cases.

// NOTE: returns nothing on purpose. These writes are often used directly as a
// useEffect body — `useEffect(() => safeSetItem(...), deps)` — and if this
// returned a value (e.g. a boolean) React would treat it as a cleanup function
// and call it on unmount, throwing "destroy is not a function". Keep it void.
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    // QuotaExceededError, private-mode restrictions, etc. — never crash.
    try {
      console.warn(`[storage] could not save "${key}" (${e?.name || 'error'}). It may be too large.`)
    } catch {
      /* ignore */
    }
  }
}

export function safeGetItem(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
