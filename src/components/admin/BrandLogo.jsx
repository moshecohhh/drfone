// Brand mark for the device brands. Apple uses its silhouette; the rest use
// recognizable colored monograms (avoids shipping copyrighted logo files).
const APPLE_PATH =
  'M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.73-1.05-2.76-4.15zM14.69 4.6c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z'

function markFor(label = '') {
  const l = label.toLowerCase()
  if (l.includes('apple') || l.includes('iphone')) return { kind: 'apple', bg: '#000' }
  if (l.includes('samsung') || l.includes('galaxy')) return { kind: 'mono', text: 'S', bg: '#1428A0' }
  if (l.includes('xiaomi') || l.includes('redmi')) return { kind: 'mono', text: 'Mi', bg: '#FF6900' }
  if (l.includes('qliux') || l.includes('askols')) return { kind: 'mono', text: 'Q', bg: '#108c8b' }
  if (l.includes('first')) return { kind: 'mono', text: 'F', bg: '#403f41' }
  return { kind: 'mono', text: (label[0] || '?').toUpperCase(), bg: '#94a3b8' }
}

export default function BrandLogo({ brand, size = 22, className = '' }) {
  const m = markFor(brand)
  const style = { width: size, height: size, backgroundColor: m.bg }
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md text-white ${className}`}
      style={style}
      aria-hidden
    >
      {m.kind === 'apple' ? (
        <svg viewBox="0 0 24 24" width={size * 0.66} height={size * 0.66} fill="#fff">
          <path d={APPLE_PATH} />
        </svg>
      ) : (
        <span style={{ fontSize: size * 0.42 }} className="font-extrabold leading-none">
          {m.text}
        </span>
      )}
    </span>
  )
}
