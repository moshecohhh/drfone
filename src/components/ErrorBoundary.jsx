import { Component } from 'react'

// Last-resort safety net: if anything throws during render, show a recovery
// screen instead of a blank white page — with a one-click option to clear the
// locally saved data (which is the usual culprit when the app works in a fresh
// incognito window but not in the normal one).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  reload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  resetData = () => {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <div className="max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-extrabold text-ink">משהו השתבש בטעינת האתר</h1>
          <p className="mt-2 text-sm text-ink-light">
            נסו לרענן את הדף. אם הבעיה חוזרת, ייתכן שהנתונים השמורים בדפדפן גדולים מדי או פגומים — אפשר לנקות אותם
            כדי לשחזר את האתר (פעולה זו לא משפיעה על מכשירים אחרים).
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={this.reload}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              רענון הדף
            </button>
            <button
              onClick={this.resetData}
              className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-black/5"
            >
              ניקוי נתונים מקומיים ושחזור
            </button>
          </div>
        </div>
      </div>
    )
  }
}
