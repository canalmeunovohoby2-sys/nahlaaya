import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../admin/admin-auth-context'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/produtos', label: 'Produtos e estoque' },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/integracoes', label: 'Integrações' },
]

export function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-sidebar__logo" aria-label="Nahla Aya — painel">
          <img src="/logosite.png" alt="Nahla Aya" width={668} height={546} />
        </Link>

        <p className="admin-sidebar__label">Painel administrativo</p>

        <nav className="admin-nav" aria-label="Navegação administrativa">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `admin-nav__link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <div className="admin-user">
            <span className="admin-user__name">{admin?.name}</span>
            <span className="admin-user__email">{admin?.email}</span>
          </div>
          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Saindo...' : 'Sair do painel'}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <p>Gestão Nahla Aya</p>
          <div className="admin-topbar__actions">
            <Link to="/" className="admin-topbar__store">
              Ver loja
            </Link>
            <button
              type="button"
              className="admin-topbar__logout"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
