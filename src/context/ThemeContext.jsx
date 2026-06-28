import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { safeSetItem } from '../utils/storage.js'

// Light/Dark theme. Adds/removes the `dark` class on <html> and persists choice.
const KEY = 'drfone_theme'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Always default to light (even when the OS prefers dark / storage is
    // cleared). Dark mode is opt-in — via the toggle or the night-time prompt.
    try {
      const saved = localStorage.getItem(KEY)
      return saved === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  const firstRun = useRef(true)

  useEffect(() => {
    const root = document.documentElement
    // Enable the unified color transition only AFTER the first paint, so the
    // initial load doesn't flash. Everything then crossfades together (one
    // duration, zero stagger) for a smooth light/dark switch.
    let timer
    if (firstRun.current) {
      firstRun.current = false
    } else {
      root.classList.add('theme-transition')
      timer = setTimeout(() => root.classList.remove('theme-transition'), 200)
    }
    root.classList.toggle('dark', theme === 'dark')
    try {
      safeSetItem(KEY, theme)
    } catch {
      /* ignore */
    }
    return () => clearTimeout(timer)
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const setMode = useCallback((mode) => setTheme(mode === 'dark' ? 'dark' : 'light'), [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>')
  return ctx
}
