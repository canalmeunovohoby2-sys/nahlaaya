import { useId } from 'react'

export function PerfumeBottleArt({ className }: { className?: string }) {
  const rawId = useId()
  const id = rawId.replace(/:/g, '')

  return (
    <svg
      className={className}
      viewBox="0 0 360 480"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-halo`} cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor="#F3E4AD" stopOpacity=".3" />
          <stop offset="60%" stopColor="#E5A744" stopOpacity=".08" />
          <stop offset="100%" stopColor="#072108" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-glass`} x1="120" y1="150" x2="260" y2="410">
          <stop offset="0%" stopColor="#F9EFCF" stopOpacity=".92" />
          <stop offset="45%" stopColor="#F3E4AD" stopOpacity=".72" />
          <stop offset="100%" stopColor="#D9BE79" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`${id}-cap`} x1="150" y1="90" x2="215" y2="160">
          <stop offset="0%" stopColor="#F8EAB8" />
          <stop offset="55%" stopColor="#E5A744" />
          <stop offset="100%" stopColor="#B87C23" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="125" y1="170" x2="190" y2="390">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="180" cy="441" rx="112" ry="15" fill="#031404" opacity=".45" />
      <circle cx="180" cy="236" r="156" fill={`url(#${id}-halo)`} />

      <g stroke="#E5A744" strokeWidth="1.1" opacity=".32">
        <path d="M64 420c28-70 20-130-8-184" />
        <path d="M68 366c-23-8-36-25-40-50 23 3 38 17 40 50Z" />
        <path d="M57 318c19-11 27-29 25-54-20 8-30 26-25 54Z" />
        <path d="M292 416c-24-58-18-116 6-164" />
        <path d="M289 368c21-7 33-22 37-44-21 3-35 16-37 44Z" />
        <path d="M298 324c-17-10-24-26-22-48 18 7 27 23 22 48Z" />
      </g>

      <g stroke="#F3E4AD" strokeWidth="1" opacity=".28">
        <circle cx="180" cy="236" r="132" />
        <circle cx="180" cy="236" r="119" strokeDasharray="1 9" />
      </g>

      <g>
        <rect
          x="110"
          y="150"
          width="140"
          height="262"
          rx="68"
          fill={`url(#${id}-glass)`}
          stroke="#F3E4AD"
          strokeOpacity=".62"
          strokeWidth="1.4"
        />
        <rect
          x="122"
          y="170"
          width="43"
          height="204"
          rx="22"
          fill={`url(#${id}-shine)`}
          opacity=".55"
        />
        <rect
          x="144"
          y="94"
          width="72"
          height="64"
          rx="14"
          fill={`url(#${id}-cap)`}
          stroke="#F8EAB8"
          strokeOpacity=".55"
          strokeWidth="1"
        />
        <rect x="155" y="73" width="50" height="26" rx="7" fill="#E5A744" />
        <rect x="149" y="151" width="62" height="10" rx="5" fill="#E5A744" opacity=".9" />
        <rect
          x="132"
          y="254"
          width="96"
          height="92"
          rx="4"
          fill="#072108"
          fillOpacity=".9"
          stroke="#E5A744"
          strokeOpacity=".55"
        />
        <text
          x="180"
          y="297"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="23"
          letterSpacing="5"
          fill="#F3E4AD"
        >
          NA
        </text>
        <line x1="159" y1="307" x2="201" y2="307" stroke="#E5A744" strokeOpacity=".65" />
        <text
          x="180"
          y="324"
          textAnchor="middle"
          fontFamily="'Segoe UI', Arial, sans-serif"
          fontSize="7"
          letterSpacing="2.4"
          fill="#F3E4AD"
        >
          NAHLA AYA
        </text>
        <path
          d="M126 379c18 8 34 8 52 0 20-9 38-9 56 0"
          stroke="#FFFFFF"
          strokeOpacity=".28"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  )
}
