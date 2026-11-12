import { useCallback, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navigation } from '../../data/categories'
import { useCart } from '../../hooks/useCart'
import { BagIcon, MenuIcon, SearchIcon } from '../icons/Icons'
import { Logo } from '../ui/Logo'
import { MobileMenu } from './MobileMenu'

function HeaderSearch({
  initialTerm,
  onSearch,
}: {
  initialTerm: string
  onSearch: (term: string) => void
}) {
  const [term, setTerm] = useState(initialTerm)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(term.trim())
  }

  return (
    <form className="header-search" role="search" onSubmit={handleSubmit}>
      <SearchIcon className="header-search__icon" width={18} height={18} />
      <label className="visually-hidden" htmlFor="site-search">
        Buscar perfume ou marca
      </label>
      <input
        id="site-search"
        type="search"
        name="busca"
        placeholder="Buscar perfume ou marca"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="header-search__submit">
        Buscar
      </button>
    </form>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { totalItems } = useCart()
  const toggleRef = useRef<HTMLButtonElement>(null)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  function handleSearch(cleanTerm: string) {
    if (cleanTerm) {
      navigate(`/perfumes?busca=${encodeURIComponent(cleanTerm)}`)
    } else {
      navigate('/perfumes')
    }

    closeMenu()
  }

  return (
    <>
      <div className="announcement">
        <div className="container announcement__inner">
          <span>Curadoria de perfumes</span>
          <span className="announcement__dot" aria-hidden="true" />
          <span>Pix, débito e até 3x</span>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <button
            ref={toggleRef}
            type="button"
            className="icon-button menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon width={22} height={22} />
          </button>

          <Logo onClick={closeMenu} />

          <HeaderSearch
            initialTerm={new URLSearchParams(location.search).get('busca') ?? ''}
            onSearch={handleSearch}
          />

          <div className="header-actions">
            <NavLink
              to="/carrinho"
              className={({ isActive }) =>
                `icon-button cart-link${isActive ? ' is-active' : ''}`
              }
              aria-label={
                totalItems > 0
                  ? `Sacola com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`
                  : 'Sacola vazia'
              }
            >
              <BagIcon width={22} height={22} />
              {totalItems > 0 ? (
                <span className="cart-link__badge" aria-hidden="true">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              ) : null}
            </NavLink>
          </div>
        </div>

        <nav className="header-nav" aria-label="Categorias">
          <ul className="container header-nav__inner">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'is-active' : '')}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        returnFocusRef={toggleRef}
      />
    </>
  )
}
