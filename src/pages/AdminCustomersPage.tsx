import { useEffect, useState } from 'react'
import { getCustomers } from '../admin/api'
import {
  formatCents,
  formatCpfDisplay,
  formatDateTime,
  formatPhoneDisplay,
} from '../admin/format'
import { usePageTitle } from '../hooks/usePageTitle'
import type { AdminCustomer } from '../types/admin'

export function AdminCustomersPage() {
  usePageTitle('Clientes')
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await getCustomers()
        if (active) {
          setCustomers(data)
          setError(null)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os clientes.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Relacionamento</p>
          <h1>Clientes</h1>
          <p className="admin-page__lead">
            Dados de contato e histórico de compras dos clientes da loja.
          </p>
        </div>
      </div>

      {loading ? <div className="admin-state">Carregando clientes...</div> : null}
      {error ? <div className="admin-state admin-state--error">{error}</div> : null}

      {!loading && !error && customers.length === 0 ? (
        <div className="admin-empty">Nenhum cliente cadastrado ainda.</div>
      ) : null}

      {!loading && !error && customers.length > 0 ? (
        <section className="admin-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>CPF</th>
                  <th>Pedidos</th>
                  <th>Total pago</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.full_name}</strong>
                    </td>
                    <td>
                      {customer.email}
                      <span className="admin-table__sub">
                        {formatPhoneDisplay(customer.phone)}
                      </span>
                    </td>
                    <td>{formatCpfDisplay(customer.cpf)}</td>
                    <td>{customer.order_count}</td>
                    <td>{formatCents(customer.paid_total_cents)}</td>
                    <td>{formatDateTime(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
