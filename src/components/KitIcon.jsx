/**
 * Simple SVG jersey silhouette.
 * homeColor / awayColor can be any CSS colour string.
 */
export default function KitIcon({ color = '#ffffff', size = 28, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Jersey body */}
      <path
        d="M10 2 L6 7 L1 5 L1 14 L7 13 L7 34 L25 34 L25 13 L31 14 L31 5 L26 7 L22 2 C21 4 19 5 16 5 C13 5 11 4 10 2 Z"
        fill={color}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
      />
      {/* Collar */}
      <path
        d="M13 2 Q16 6 19 2"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
    </svg>
  )
}
