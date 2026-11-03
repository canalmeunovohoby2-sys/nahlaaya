import { Link } from 'react-router-dom'
import type { BrandSummary } from '../../lib/catalog'
import { ArrowUpRightIcon } from '../icons/Icons'

export function BrandCard({ brand }: { brand: BrandSummary }) {
  return (
    <Link to={`/perfumes?marca=${brand.slug}`} className="brand-card">
      <span className="brand-card__monogram" aria-hidden="true">
        {brand.name.charAt(0)}
      </span>
      <span className="brand-card__body">
        <h3 className="brand-card__name">{brand.name}</h3>
        <span className="brand-card__count">
          {brand.count === 1 ? '1 perfume' : `${brand.count} perfumes`}
        </span>
      </span>
      <span className="brand-card__arrow" aria-hidden="true">
        <ArrowUpRightIcon width={18} height={18} />
      </span>
    </Link>
  )
}
