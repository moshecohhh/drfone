import { useRef, useEffect } from 'react'
import { Bold, Italic, Underline, Baseline, Highlighter, RemoveFormatting } from 'lucide-react'

// Lightweight contentEditable rich-text editor for manual text fields (e.g. the
// free-text product spec). Stores HTML; format with the toolbar: bold / italic /
// underline / font colour / highlight. Output is sanitised before it renders on
// the public site (see utils/sanitizeHtml.js).
export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null)

  // Sync the DOM when the value changes from OUTSIDE (e.g. switching products).
  // Skipped while the editor itself is the source of the change, so the caret
  // never jumps.
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  const emit = () => onChange(ref.current?.innerHTML || '')

  const exec = (cmd, arg) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const isEmpty = !value || value === '<br>'

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-black/5 bg-black/[.02] p-1.5">
        <ToolBtn label="מודגש" onClick={() => exec('bold')}><Bold size={15} /></ToolBtn>
        <ToolBtn label="נטוי" onClick={() => exec('italic')}><Italic size={15} /></ToolBtn>
        <ToolBtn label="קו תחתון" onClick={() => exec('underline')}><Underline size={15} /></ToolBtn>
        <span className="mx-0.5 h-5 w-px bg-black/10" />
        <ColorBtn label="צבע טקסט" icon={Baseline} onPick={(c) => exec('foreColor', c)} defaultColor="#108c8b" />
        <ColorBtn label="צבע הדגשה" icon={Highlighter} onPick={(c) => exec('hiliteColor', c)} defaultColor="#fff3a3" />
        <span className="mx-0.5 h-5 w-px bg-black/10" />
        <ToolBtn label="ניקוי עיצוב" onClick={() => exec('removeFormat')}><RemoveFormatting size={15} /></ToolBtn>
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-ink-light/60">{placeholder}</span>
        )}
        <div
          ref={ref}
          contentEditable
          dir="rtl"
          onInput={emit}
          onBlur={emit}
          className="min-h-[110px] px-3 py-2.5 text-sm leading-relaxed text-ink outline-none [&_*]:max-w-full"
          suppressContentEditableWarning
        />
      </div>
    </div>
  )
}

function ToolBtn({ label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Use onMouseDown + preventDefault so the text selection isn't lost when
      // the button takes focus.
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-light transition hover:bg-black/5 hover:text-ink"
    >
      {children}
    </button>
  )
}

function ColorBtn({ label, icon: Icon, onPick, defaultColor }) {
  return (
    <label
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-light transition hover:bg-black/5 hover:text-ink"
    >
      <Icon size={15} />
      <input
        type="color"
        defaultValue={defaultColor}
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  )
}
