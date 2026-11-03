import { Link } from 'react-router-dom'

export function Logo({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  return (
    <Link
      to="/"
      className={`logo ${className}`.trim()}
      aria-label="Nahla Aya — página inicial"
      onClick={onClick}
    >
      <img
        src="/logosite.png"
        alt="Nahla Aya"
        className="logo__image"
        width={668}
        height={546}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </Link>
  )
}
