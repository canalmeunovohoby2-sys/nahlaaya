export function BottleLineArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M48 13h24v15H48zM43 28h34l8 15v89a8 8 0 0 1-8 8H43a8 8 0 0 1-8-8V43l8-15Z" />
      <path d="M35 72h50v50H35z" />
      <path d="M51 49h18" />
      <path d="M39 108c7 3 13 3 20 0 8-4 15-4 22 0" />
      <path d="M46 84h28M46 92h18" />
    </svg>
  )
}
