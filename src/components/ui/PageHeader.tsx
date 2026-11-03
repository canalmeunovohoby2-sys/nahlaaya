import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Você está aqui">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`}>
              {item.to && !isLast ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  crumbs?: Crumb[]
  meta?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  meta,
}: PageHeaderProps) {
  return (
    <section className="page-hero">
      <div className="container">
        {crumbs ? <Breadcrumb items={crumbs} /> : null}
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-hero__lead">{description}</p> : null}
        {meta ? <div className="page-hero__meta">{meta}</div> : null}
      </div>
    </section>
  )
}
