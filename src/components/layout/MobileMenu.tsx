import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { NavLink } from 'react-router-dom'
import { navigation } from '../../data/categories'
import { siteConfig } from '../../config/site'
import { useCart } from '../../hooks/useCart'
import { ArrowUpRightIcon, BagIcon, CloseIcon } from '../icons/Icons'
import { Logo } from '../ui/Logo'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  returnFocusRef: RefObject<HTMLButtonElement | null>
}

export function MobileMenu({ open, onClose, returnFocusRef }: MobileMenuProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { totalItems } = useCart()

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const returnFocusElement = returnFocusRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    function handleResize() {
      if (window.innerWidth > 900) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
      returnFocusElement?.focus()
    }
  }, [open, onClose, returnFocusRef])

  if (!open) {
    return null
  }

  return (
    <div className="mobile-menu-shell">
      <button
        type="button"
        className="mobile-menu__overlay"
        aria-label="Fechar menu"
        tabIndex={-1}
        onClick={onClose}
      />

      <aside
        id="mobile-menu"
        className="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        <h2 id="mobile-menu-title" className="visually-hidden">
          Menu de navegação
        </h2>

        <div className="mobile-menu__head">
          <Logo onClick={onClose} />
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <CloseIcon width={22} height={22} />
          </button>
        </div>

        <nav className="mobile-menu__nav" aria-label="Menu principal">
          <ul>
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `mobile-menu__link${isActive ? ' is-active' : ''}`
                  }
                  onClick={onClose}
                >
                  <span className="mobile-menu__index">{item.index}</span>
                  <span>{item.label}</span>
                  <ArrowUpRightIcon
                    className="mobile-menu__arrow"
                    width={18}
                    height={18}
                  />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mobile-menu__foot">
          <div className="mobile-menu__shortcuts">
            <NavLink to="/carrinho" className="mobile-menu__shortcut" onClick={onClose}>
              <BagIcon width={19} height={19} />
              Sacola
              {totalItems > 0 ? <span>{totalItems}</span> : null}
            </NavLink>
          </div>
          <p className="mobile-menu__signature">
            {siteConfig.wordmark} · {siteConfig.tagline}
          </p>
        </div>
      </aside>
    </div>
  )
}
