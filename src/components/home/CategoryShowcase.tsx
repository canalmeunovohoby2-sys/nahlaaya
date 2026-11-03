import { Link } from 'react-router-dom'
import {
  ArrowUpRightIcon,
  FlowerIcon,
  LeafIcon,
  TagIcon,
} from '../icons/Icons'

const categoryLinks = [
  {
    to: '/femininos',
    label: 'Femininos',
    description: 'Perfumes femininos',
    icon: FlowerIcon,
    tone: 'feminine',
  },
  {
    to: '/masculinos',
    label: 'Masculinos',
    description: 'Perfumes masculinos',
    icon: LeafIcon,
    tone: 'masculine',
  },
  {
    to: '/ofertas',
    label: 'Ofertas',
    description: 'Condições especiais',
    icon: TagIcon,
    tone: 'offers',
  },
]

export function CategoryShowcase() {
  return (
    <section className="category-showcase" aria-labelledby="category-showcase-title">
      <div className="container">
        <div className="category-showcase__heading">
          <div>
            <p className="eyebrow">Coleções</p>
            <h2 id="category-showcase-title">Navegue por categoria</h2>
          </div>
          <Link to="/perfumes" className="shelf-link">
            Ver catálogo completo
            <ArrowUpRightIcon width={15} height={15} />
          </Link>
        </div>

        <div className="category-showcase__grid">
          {categoryLinks.map((category) => {
            const Icon = category.icon

            return (
              <Link
                key={category.to}
                to={category.to}
                className={`category-tile category-tile--${category.tone}`}
              >
                <span className="category-tile__icon" aria-hidden="true">
                  <Icon width={38} height={38} />
                </span>
                <span className="category-tile__body">
                  <span className="category-tile__label">{category.description}</span>
                  <span className="category-tile__title">{category.label}</span>
                </span>
                <ArrowUpRightIcon
                  className="category-tile__arrow"
                  width={17}
                  height={17}
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
