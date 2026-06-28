import { useRef, useState, useCallback } from 'react'

// Interactive 3x3 pattern lock. Drag across the dots to draw a pattern;
// the sequence is reported as a string like "1-5-9-6" (dots numbered 1..9).
// `value` is the saved sequence string; `onChange(seqString)` fires on release.
const SIZE = 220
const PAD = 34
const GAP = (SIZE - 2 * PAD) / 2
const DOTS = Array.from({ length: 9 }, (_, i) => ({
  i,
  x: PAD + (i % 3) * GAP,
  y: PAD + Math.floor(i / 3) * GAP,
}))

export default function PatternLock({ value = '', onChange }) {
  const svgRef = useRef(null)
  const [path, setPath] = useState(() =>
    value ? value.split('-').map((n) => Number(n) - 1).filter((n) => n >= 0) : [],
  )
  const [drawing, setDrawing] = useState(false)
  const [cursor, setCursor] = useState(null)

  const toLocal = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const scale = SIZE / rect.width
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale }
  }, [])

  const dotAt = useCallback((p) => {
    for (const d of DOTS) {
      if (Math.hypot(p.x - d.x, p.y - d.y) < GAP * 0.42) return d.i
    }
    return -1
  }, [])

  const start = (e) => {
    e.preventDefault()
    const p = toLocal(e)
    const hit = dotAt(p)
    setDrawing(true)
    setCursor(p)
    setPath(hit >= 0 ? [hit] : [])
  }
  const move = (e) => {
    if (!drawing) return
    const p = toLocal(e)
    setCursor(p)
    const hit = dotAt(p)
    if (hit >= 0 && !path.includes(hit)) setPath((prev) => [...prev, hit])
  }
  const end = () => {
    if (!drawing) return
    setDrawing(false)
    setCursor(null)
    // A real device pattern needs at least 4 dots — releasing with fewer simply
    // resets to empty instead of saving a too-short pattern.
    if (path.length < 4) {
      setPath([])
      onChange?.('')
      return
    }
    onChange?.(path.map((i) => i + 1).join('-'))
  }
  const clear = () => {
    setPath([])
    onChange?.('')
  }

  const linePts = path.map((i) => DOTS[i])

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-56 w-56 touch-none select-none rounded-2xl bg-ink/5"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      >
        {/* connecting lines */}
        {linePts.map((d, idx) =>
          idx === 0 ? null : (
            <line
              key={idx}
              x1={linePts[idx - 1].x}
              y1={linePts[idx - 1].y}
              x2={d.x}
              y2={d.y}
              stroke="#108c8b"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ),
        )}
        {/* live segment to cursor */}
        {drawing && linePts.length > 0 && cursor && (
          <line
            x1={linePts[linePts.length - 1].x}
            y1={linePts[linePts.length - 1].y}
            x2={cursor.x}
            y2={cursor.y}
            stroke="#108c8b"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.5"
          />
        )}
        {/* dots — the first one (start point) is amber */}
        {DOTS.map((d) => {
          const active = path.includes(d.i)
          const isStart = path.length > 0 && path[0] === d.i
          const color = isStart ? '#f59e0b' : '#108c8b'
          return (
            <g key={d.i}>
              <circle
                cx={d.x}
                cy={d.y}
                r="16"
                fill={active ? color : '#fff'}
                stroke={active ? color : '#cbd5d5'}
                strokeWidth="2"
              />
              {active && <circle cx={d.x} cy={d.y} r="6" fill="#fff" />}
            </g>
          )
        })}
      </svg>
      <div className="flex flex-col items-center gap-1 text-xs text-ink-light">
        <span>
          תבנית: <span className="font-mono font-bold text-ink">{path.map((i) => i + 1).join('-') || '—'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
          נקודת ההתחלה
          <button type="button" onClick={clear} className="mr-2 font-semibold text-brand-600 hover:underline">
            ניקוי
          </button>
        </span>
      </div>
    </div>
  )
}
