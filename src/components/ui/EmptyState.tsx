import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  headingLevel?: 'h2' | 'h3'
  variant?: 'default' | 'soft'
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  headingLevel = 'h2',
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const Heading = headingLevel

  return (
    <div className={`empty-state empty-state--${variant} ${className}`.trim()}>
      {icon ? <div className="empty-state__icon">{icon}</div> : null}
      <Heading className="empty-state__title">{title}</Heading>
      {description ? <p className="empty-state__description">{description}</p> : null}
      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </div>
  )
}
