import { useState } from 'react'
import { Send, History } from 'lucide-react'

const fmt = (iso) =>
  new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })

// Reusable timestamped update journal for orders & repair tickets.
// `entries`: [{ id, text, at, author? }]; `onAdd(text)` appends a new entry.
export default function JournalLog({ entries = [], onAdd, title = 'יומן עדכונים' }) {
  const [text, setText] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-light">
        <History size={13} /> {title}
      </p>

      {entries.length > 0 && (
        <ul className="mb-3 space-y-2">
          {[...entries].reverse().map((en) => (
            <li key={en.id} className="rounded-xl bg-white/70 p-2.5 text-sm ring-1 ring-black/5">
              <p className="text-ink">{en.text}</p>
              <p className="mt-1 text-[11px] text-ink-light" dir="ltr">
                {fmt(en.at)}
                {en.author ? ` · ${en.author}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="הוספת עדכון..."
          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600"
          aria-label="הוספת עדכון"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
