import { useEffect, useState } from 'react'
import { AdminOrderDetailPanel } from '../components/admin/AdminOrderDetail'
import { useAdminAuth } from '../admin/admin-auth-context'
import { getOrder, getOrders } from '../admin/api'
import {
  deliveryStatusLabels,
  formatCents,
  formatDateTime,
  paymentMethodLabels,
  paymentStatusLabels,
  statusTone,
} from '../admin/format'
import { usePageTitle } from '../hooks/usePageTitle'
import type {
  AdminOrderDetail,
  AdminOrderListItem,
} from '../types/admin'

export function AdminOrdersPage() {
  usePageTitle('Pedidos')
  const { csrfToken } = useAdminAuth()
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetail | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await getOrders()

        if (!active) {
          return
        }

        setOrders(data)
        setError(null)

        if (data.length > 0) {
          setSelectedId(data[0].id)
          const detail = await getOrder(data[0].id)
          if (active) {
            setSelectedOrder(detail)
          }
        } else {
          setSelectedOrder(null)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os pedidos.')
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

  useEffect(() => {
    if (!selectedId) {
      return
    }

    let active = true

    async function loadDetail() {
      try {
        const detail = await getOrder(selectedId as number)
        if (active) {
          setSelectedOrder(detail)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar o pedido selecionado.')
        }
      } finally {
        if (active) {
        }
      }
    }

    void loadDetail()

    return () => {
      active = false
    }
  }, [selectedId])

  function handleUpdated(updated: AdminOrderDetail) {
    setSelectedOrder(updated)
    setOrders((current) =>
      current.map((order) =>
        order.id === updated.id
          ? {
              ...order,
              payment_status: updated.payment_status,
              delivery_status: updated.delivery_status,
              total_cents: updated.total_cents,
            }
          : order,
      ),
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <p className="admin-eyebrow">Operação</p>
          <h1>Pedidos</h1>
          <p className="admin-page__lead">
            Consulte clientes, itens, valores e atualize os status de pagamento e
            entrega.
          </p>
        </div>
      </div>

      {loading ? <div className="admin-state">Carregando pedidos...</div> : null}
      {error ? <div className="admin-state admin-state--error">{error}</div> : null}

      {!loading && !error && orders.length === 0 ? (
        <div className="admin-empty">Nenhum pedido registrado ainda.</div>
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <div className="admin-orders-layout">
          <section className="admin-card admin-orders-list">
            <div className="admin-card__head">
              <div>
                <h2>Histórico</h2>
                <p className="admin-card__hint">{orders.length} pedidos</p>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={selectedId === order.id ? 'is-selected' : ''}
                    >
                      <td>
                        <button
                          type="button"
                          className="admin-order-number"
                          onClick={() => setSelectedId(order.id)}
                        >
                          {order.order_number}
                        </button>
                        <span className="admin-table__sub">
                          {formatDateTime(order.created_at)}
                        </span>
                      </td>
                      <td>
                        <strong>{order.customer_name}</strong>
                        <span className="admin-table__sub">
                          {paymentMethodLabels[order.payment_method]}
                        </span>
                      </td>
                      <td>{formatCents(order.total_cents)}</td>
                      <td>
                        <span className={statusTone(order.payment_status)}>
                          {paymentStatusLabels[order.payment_status]}
                        </span>
                        <span className="admin-table__sub">
                          {deliveryStatusLabels[order.delivery_status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="admin-order-panel">
            {selectedOrder ? (
              <AdminOrderDetailPanel
                key={selectedOrder.id}
                order={selectedOrder}
                csrfToken={csrfToken}
                onUpdated={handleUpdated}
              />
            ) : (
              <div className="admin-empty">Selecione um pedido.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
