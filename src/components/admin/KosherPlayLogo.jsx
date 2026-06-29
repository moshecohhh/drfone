// KosherPlay brand mark — a blue rounded square with the yellow bar + white
// loop. Rendered as an inline SVG so it works both as a nav icon (sized like a
// lucide icon) and larger in the panel header. Accepts `size` and `className`.
export default function KosherPlayLogo({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="96" height="96" rx="22" fill="#1577be" />
      {/* yellow bar ("I") */}
      <rect x="24" y="24" width="14" height="52" fill="#f6a800" />
      {/* white loop + diagonal tail ("Q") */}
      <path
        fill="#ffffff"
        d="M62 24c-11 0-20 8.6-20 19.4 0 8.2 5.2 15.2 12.7 18.2L70 76h16L66.5 60.9C73.4 57.8 78 51.1 78 43.4 78 32.6 73 24 62 24zm0 11.5c5 0 8.4 3.6 8.4 8.1S67 51.7 62 51.7s-8.4-3.6-8.4-8.1S57 35.5 62 35.5z"
      />
    </svg>
  )
}
