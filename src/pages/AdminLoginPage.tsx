import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../admin/admin-auth-context'
import { AdminApiError } from '../admin/api'
import { usePageTitle } from '../hooks/usePageTitle'

export function AdminLoginPage() {
  usePageTitle('Acesso administrativo')

  const { status, login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (loginError) {
      setError(
        loginError instanceof AdminApiError
          ? loginError.message
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-login">
      <aside className="admin-login__brand">
        <Link to="/" className="admin-login__logo" aria-label="Nahla Aya — loja">
          <img src="/logosite.png" alt="Nahla Aya" width={668} height={546} />
        </Link>
        <div className="admin-login__brand-copy">
          <p className="admin-eyebrow">Área restrita</p>
          <h1>
            Gestão da loja
            <br />
            <em>com cuidado.</em>
          </h1>
          <p>
            Produtos, pedidos e clientes da Nahla Aya em um único lugar.
          </p>
        </div>
        <p className="admin-login__brand-foot">NAHLA AYA · PAINEL ADMINISTRATIVO</p>
      </aside>

      <main className="admin-login__panel">
        <div className="admin-login__box">
          <p className="admin-eyebrow">Acesso administrativo</p>
          <h2>Entrar no painel</h2>
          <p className="admin-login__intro">
            Informe suas credenciais para acessar a gestão da loja.
          </p>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="admin-email">E-mail</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="admin-field">
              <label htmlFor="admin-password">Senha</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error ? (
              <p className="admin-form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn--gold btn--block"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="admin-login__notice">
            Acesso exclusivo para administradores cadastrados. Não há cadastro
            público.
          </p>

          <Link to="/" className="admin-login__back">
            Voltar à loja
          </Link>
        </div>
      </main>
    </div>
  )
}
