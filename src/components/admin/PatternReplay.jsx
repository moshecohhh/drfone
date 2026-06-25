import { useId } from 'react'

// Live, looping replay of a saved pattern (e.g. "1-5-9-6").
// The line is "drawn" progressively; each dot starts GREY and turns turquoise
// exactly when the drawing line reaches it. The start dot stays amber.
const VB = 64
const PAD = 13
const GAP = (VB - 2 * PAD) / 2
const dotPos = (n) => ({ x: PAD + ((n - 1) % 3) * GAP, y: PAD + Math.floor((n - 1) / 3) * GAP })
const ALL = Array.from({ length: 9 }, (_, i) => i + 1)

const DURATION = 2.6 // seconds (must match the line + dot animations)
const DRAW_PCT = 60 // % of the timeline spent drawing (rest is the hold)
const GREY = '#cbd5d5'
const TEAL = '#108c8b'
const AMBER = '#f59e0b'

export default function PatternReplay({ pattern, size = 80 }) {
  const uid = useId().replace(/[:]/g, '')
  const seq = String(pattern || '')
    .split('-')
    .map(Number)
    .filter((n) => n >= 1 && n <= 9)
  const pts = seq.map(dotPos)

  // Cumulative path length to each dot (drives the per-dot timing).
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  const total = cum[cum.length - 1] || 1
  const points = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const animName = (k) => `prdot-${uid}-${k}`

  // One keyframes rule per non-start dot: grey until the line reaches it, then teal.
  const dotKeyframes = seq
    .map((_, k) => {
      if (k === 0) return ''
      const p = Math.min((cum[k] / total) * DRAW_PCT, 99)
      return `@keyframes ${animName(k)}{0%{fill:${GREY}}${p.toFixed(2)}%{fill:${GREY}}${(p + 0.5).toFixed(2)}%{fill:${TEAL}}100%{fill:${TEAL}}}`
    })
    .join('\n')

  return (
    <>
      {dotKeyframes && <style>{dotKeyframes}</style>}
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className="rounded-lg bg-ink/5">
        {/* faint full path so the shape is always readable */}
        {pts.length > 1 && (
          <polyline points={points} fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
        )}
        {/* animated draw-on line (linear, synced with the dots) */}
        {pts.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke={TEAL}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              '--pl': total,
              strokeDasharray: total,
              strokeDashoffset: total,
              animation: `drawPattern ${DURATION}s linear infinite`,
            }}
          />
        )}

        {/* dots — grey by default; sequence dots light up as the line passes */}
        {ALL.map((n) => {
          const idx = seq.indexOf(n)
          const p = dotPos(n)
          if (idx === -1) {
            return <circle key={n} cx={p.x} cy={p.y} r="3" fill={GREY} />
          }
          if (idx === 0) {
            // start point — amber, always visible
            return (
              <g key={n}>
                <circle cx={p.x} cy={p.y} r="8.5" fill="none" stroke={AMBER} strokeWidth="1.5" />
                <circle cx={p.x} cy={p.y} r="5.5" fill={AMBER} />
              </g>
            )
          }
          return (
            <circle
              key={n}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill={GREY}
              style={{ animation: `${animName(idx)} ${DURATION}s linear infinite` }}
            />
          )
        })}
      </svg>
    </>
  )
}
