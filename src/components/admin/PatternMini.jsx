// Tiny read-only 3x3 dot grid that draws a recorded pattern (e.g. "1-5-9").
const VB = 60
const PAD = 12
const GAP = (VB - 2 * PAD) / 2
const DOTS = Array.from({ length: 9 }, (_, i) => ({
  n: i + 1,
  x: PAD + (i % 3) * GAP,
  y: PAD + Math.floor(i / 3) * GAP,
}))

export default function PatternMini({ pattern, size = 52 }) {
  const seq = String(pattern || '')
    .split('-')
    .map((n) => Number(n))
    .filter((n) => n >= 1 && n <= 9)
  const pts = seq.map((n) => DOTS[n - 1])

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} className="rounded-lg bg-ink/5">
      {pts.map((d, i) =>
        i === 0 ? null : (
          <line key={i} x1={pts[i - 1].x} y1={pts[i - 1].y} x2={d.x} y2={d.y} stroke="#108c8b" strokeWidth="2.5" strokeLinecap="round" />
        ),
      )}
      {DOTS.map((d) => {
        const active = seq.includes(d.n)
        const isStart = seq.length > 0 && seq[0] === d.n // starting point
        return (
          <g key={d.n}>
            {isStart && <circle cx={d.x} cy={d.y} r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" />}
            <circle
              cx={d.x}
              cy={d.y}
              r={isStart ? 5.5 : active ? 4.5 : 3}
              fill={isStart ? '#f59e0b' : active ? '#108c8b' : '#cbd5d5'}
            />
          </g>
        )
      })}
    </svg>
  )
}
