import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.2 4.2" />
    </IconBase>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8.2" r="3.7" />
      <path d="M4.8 20c.7-3.4 3.5-5.4 7.2-5.4s6.5 2 7.2 5.4" />
    </IconBase>
  )
}

export function BagIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.2 8.4h13.6l1 11.2H4.2l1-11.2Z" />
      <path d="M8.8 9V7.2a3.2 3.2 0 0 1 6.4 0V9" />
    </IconBase>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </IconBase>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </IconBase>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12H4M10 6l-6 6 6 6" />
    </IconBase>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
    </IconBase>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5" />
    </IconBase>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4.5 12.5 4.7 4.7L19.5 6.5" />
    </IconBase>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </IconBase>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5v14M15 5v14" />
    </IconBase>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m8 5 11 7-11 7V5Z" />
    </IconBase>
  )
}

export function FlowerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 12c-3.6-1.5-3.7-6.3-.3-8.2 1.8 3 1.5 6.2.3 8.2Z" />
      <path d="M12 12c3.6-1.5 3.7-6.3.3-8.2-1.8 3-1.5 6.2-.3 8.2Z" transform="rotate(72 12 12)" />
      <path d="M12 12c-3.6-1.5-3.7-6.3-.3-8.2 1.8 3 1.5 6.2.3 8.2Z" transform="rotate(144 12 12)" />
      <path d="M12 12c-3.6-1.5-3.7-6.3-.3-8.2 1.8 3 1.5 6.2.3 8.2Z" transform="rotate(216 12 12)" />
      <path d="M12 12c-3.6-1.5-3.7-6.3-.3-8.2 1.8 3 1.5 6.2.3 8.2Z" transform="rotate(288 12 12)" />
      <circle cx="12" cy="12" r="1.6" />
    </IconBase>
  )
}

export function LeafIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 4c-8.4.4-13.4 3.7-14.5 9.3C4.6 17.5 7.3 20 10.5 19.6c5.7-.7 8.7-6.5 9.5-15.6Z" />
      <path d="M4 21c2.3-5.8 6.1-9.5 11.5-12" />
    </IconBase>
  )
}

export function TagIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4h7.3l8.7 8.7-7.3 7.3L4 11.3V4Z" />
      <circle cx="8.1" cy="8.1" r="1.2" />
    </IconBase>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5c.7 4.3 2.2 5.8 6.5 6.5-4.3.7-5.8 2.2-6.5 6.5-.7-4.3-2.2-5.8-6.5-6.5 4.3-.7 5.8-2.2 6.5-6.5Z" />
      <path d="M18.5 15.5c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9Z" />
    </IconBase>
  )
}

export function CardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 9.5h18M6.5 14.5h3" />
    </IconBase>
  )
}

export function GiftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 9.5h16V20H4V9.5ZM3 6.5h18v3H3v-3ZM12 6.5V20" />
      <path d="M12 6.5c-1.5-3.5-5.5-3.3-5.5-.7 0 1.4 1.8 2 5.5 2ZM12 6.5c1.5-3.5 5.5-3.3 5.5-.7 0 1.4-1.8 2-5.5 2Z" />
    </IconBase>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4.5h16v12H9l-5 4v-16Z" />
      <path d="M8 9h8M8 12.5h5" />
    </IconBase>
  )
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </IconBase>
  )
}
