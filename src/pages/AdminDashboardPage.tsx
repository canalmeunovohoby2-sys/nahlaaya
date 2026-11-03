import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminVisitsPanel } from '../components/admin/AdminVisitsPanel'
import { getDashboard } from '../admin/api'
import {
  deliveryStatusLabels,
  formatCents,
  formatDateTime,
  paymentMethodLabels,
  paymentStatusLabels,
  statusTone,
} from '../admin/format'
import { usePageTitle } from '../hooks/usePageTitle'
import type { AdminDashboard } from '../types/admin'

export function AdminDashboardPage() {
  usePageTitle('Dashboard')
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const dashboard = await getDashboard()
        if (active) {
          setData(dashboard)
          setError(null)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar o dashboard.')
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Visão geral</p>
          <h1>Dashboard</h1>
          <p className="admin-page__lead">
            Acompanhe o desempenho da loja e os pedidos recentes.
          </p>
        </div>
        <Link to="/admin/pedidos" className="btn btn--outline btn--sm">
          Ver todos os pedidos
        </Link>
      </div>

      {error ? (
        <div className="admin-state admin-state--error">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!data && !error ? <div className="admin-state">Carregando dados...</div> : null}

      {data ? (
        <>
          <div className="admin-stats">
            <article className="admin-stat admin-stat--highlight">
              <span>Faturamento pago</span>
              <strong>{formatCents(data.revenueCents)}</strong>
              <small>Somente pedidos com pagamento confirmado</small>
            </article>
            <article className="admin-stat">
              <span>Vendas pagas</span>
              <strong>{data.paidOrderCount}</strong>
              <small>Pedidos efetivamente pagos</small>
            </article>
            <article className="admin-stat">
              <span>Aguardando pagamento</span>
              <strong>{data.pendingPaymentCount}</strong>
              <small>Não contabilizados no faturamento</small>
            </article>
            <article className="admin-stat">
              <span>Pedidos pagos</span>
              <strong>{data.paidOrderCount}</strong>
              <small>Pedidos confirmados</small>
            </article>
            <article className="admin-stat">
              <span>Cancelados</span>
              <strong>{data.cancelledOrderCount}</strong>
              <small>Pedidos cancelados</small>
            </article>
          </div>

          <AdminVisitsPanel />

          <section className="admin-card">
            <div className="admin-card__head">
              <div>
                <p className="admin-eyebrow">Histórico</p>
                <h2>Pedidos recentes</h2>
              </div>
              <Link to="/admin/pedidos" className="admin-link">
                Abrir pedidos
              </Link>
            </div>

            {data.recentOrders.length === 0 ? (
              <div className="admin-empty">Nenhum pedido registrado ainda.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Pagamento</th>
                      <th>Status</th>
                      <th>Entrega</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link to="/admin/pedidos" className="admin-order-number">
                            {order.order_number}
                          </Link>
                        </td>
                        <td>
                          <strong>{order.customer_name}</strong>
                          <span className="admin-table__sub">{order.customer_email}</span>
                        </td>
                        <td>{paymentMethodLabels[order.payment_method]}</td>
                        <td>
                          <span className={statusTone(order.payment_status)}>
                            {paymentStatusLabels[order.payment_status]}
                          </span>
                        </td>
                        <td>
                          <span className={statusTone(order.delivery_status)}>
                            {deliveryStatusLabels[order.delivery_status]}
                          </span>
                        </td>
                        <td>{formatDateTime(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
