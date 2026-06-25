// Ask the browser's password manager (Chrome/Google, Safari, etc.) to offer
// saving the just-used credentials. Triggered right after a successful
// register/login. Uses the Credential Management API where available; it's a
// no-op on browsers that don't support it (the change still doesn't hurt).
export function savePasswordCredential(email, password, name) {
  try {
    if (typeof window !== 'undefined' && 'PasswordCredential' in window) {
      // eslint-disable-next-line no-undef
      const cred = new PasswordCredential({
        id: email,
        password,
        name: name || email,
      })
      navigator.credentials?.store(cred)
    }
  } catch {
    /* ignore — browser will fall back to its own heuristic save prompt */
  }
}
