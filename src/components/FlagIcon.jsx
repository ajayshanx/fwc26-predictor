/**
 * Country flag using flagcdn.com.
 * flagCode should be a lowercase ISO 3166-1 alpha-2 code (e.g. 'ar', 'gb-eng').
 */
export default function FlagIcon({ flagCode, size = 20, className = '' }) {
  if (!flagCode) return <span className="inline-block w-5 h-4 bg-navy-500 rounded-sm" />
  return (
    <img
      src={`https://flagcdn.com/w40/${flagCode.toLowerCase()}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      className={`rounded-sm object-cover inline-block ${className}`}
      loading="lazy"
    />
  )
}
