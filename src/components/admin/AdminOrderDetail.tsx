import { useState } from 'react'
import {
  AdminApiError,
  updateDeliveryStatus,
  updatePaymentStatus,
} from '../../admin/api'
import {
  deliveryStatusLabels,
  formatCents,
  formatCpfDisplay,
  formatDateTime,
  formatPhoneDisplay,
  paymentMethodLabels,
  paymentStatusLabels,
  statusTone,
} from '../../admin/format'
import type {
  AdminOrderDetail,
  DeliveryStatus,
  PaymentStatus,
} from '../../types/admin'

interface AdminOrderDetailPanelProps {
  order: AdminOrderDetail
  csrfToken: string | null
  onUpdated: (order: AdminOrderDetail) => void
}

const paymentOptions: PaymentStatus[] = ['pending', 'paid', 'cancelled']
const deliveryOptions: DeliveryStatus[] = [
  'pending',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
]

export function AdminOrderDetailPanel({
  order,
  csrfToken,
  onUpdated,
}: AdminOrderDetailPanelProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.payment_status,
  )
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(
    order.delivery_status,
  )
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePaymentUpdate() {
    if (!csrfToken) {
      setError('Sessão administrativa inválida. Recarregue o painel.')
      return
    }

    setSavingPayment(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await updatePaymentStatus(
        order.id,
        paymentStatus,
        csrfToken,
      )
      setPaymentStatus(updated.payment_status)
      setFeedback('Status de pagamento atualizado.')
      onUpdated(updated)
    } catch (updateError) {
      setError(
        updateError instanceof AdminApiError
          ? updateError.message
          : 'Não foi possível atualizar o pagamento.',
      )
    } finally {
      setSavingPayment(false)
    }
  }

  async function handleDeliveryUpdate() {
    if (!csrfToken) {
      setError('Sessão administrativa inválida. Recarregue o painel.')
      return
    }

    setSavingDelivery(true)
    setError(null)
    setFeedback(null)

    try {
      const updated = await updateDeliveryStatus(
        order.id,
        deliveryStatus,
        csrfToken,
      )
      setDeliveryStatus(updated.delivery_status)
      setFeedback('Status de entrega atualizado.')
      onUpdated(updated)
    } catch (updateError) {
      setError(
        updateError instanceof AdminApiError
          ? updateError.message
          : 'Não foi possível atualizar a entrega.',
      )
    } finally {
      setSavingDelivery(false)
    }
  }

  return (
    <section className="admin-order-detail">
      <div className="admin-order-detail__head">
        <div>
          <p className="admin-eyebrow">Pedido</p>
          <h2>{order.order_number}</h2>
          <p className="admin-order-detail__date">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="admin-order-detail__statuses">
          <span className={statusTone(order.payment_status)}>
            {paymentStatusLabels[order.payment_status]}
          </span>
          <span className={statusTone(order.delivery_status)}>
            {deliveryStatusLabels[order.delivery_status]}
          </span>
        </div>
      </div>

      <div className="admin-order-detail__grid">
        <div className="admin-detail-block">
          <h3>Cliente</h3>
          <p>{order.customer_name}</p>
          <p>{order.customer_email}</p>
          <p>{formatCpfDisplay(order.customer_cpf)}</p>
          <p>{formatPhoneDisplay(order.customer_phone)}</p>
        </div>
        <div className="admin-detail-block">
          <h3>Entrega</h3>
          <p>
            {order.street}, {order.number}
            {order.complement ? ` · ${order.complement}` : ''}
          </p>
          <p>{order.neighborhood}</p>
          <p>
            {order.city} — {order.state}
          </p>
          <p>CEP {order.cep}</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-table--order-items">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Pix un.</th>
              <th>3x un.</th>
              <th>Total Pix</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.product_name}</strong>
                  <span className="admin-table__sub">{item.brand}</span>
                </td>
                <td>{item.quantity}</td>
                <td>{formatCents(item.unit_pix_cents)}</td>
                <td>{formatCents(item.unit_installment_cents)}</td>
                <td>{formatCents(item.line_pix_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-order-totals">
        <div>
          <span>Pagamento selecionado</span>
          <strong>{paymentMethodLabels[order.payment_method]}</strong>
        </div>
        <div>
          <span>Subtotal Pix</span>
          <strong>{formatCents(order.subtotal_pix_cents)}</strong>
        </div>
        <div>
          <span>Subtotal débito</span>
          <strong>{formatCents(order.subtotal_debit_cents)}</strong>
        </div>
        <div>
          <span>Total em 3x</span>
          <strong>{formatCents(order.installment_total_cents)}</strong>
        </div>
        <div>
          <span>Frete</span>
          <strong>A calcular</strong>
        </div>
        <div className="admin-order-totals__total">
          <span>Total registrado</span>
          <strong>{formatCents(order.total_cents)}</strong>
        </div>
      </div>

      <div className="admin-order-actions">
        <div className="admin-status-form">
          <label htmlFor={`payment-${order.id}`}>Pagamento</label>
          <select
            id={`payment-${order.id}`}
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as PaymentStatus)
            }
          >
            {paymentOptions.map((status) => (
              <option key={status} value={status}>
                {paymentStatusLabels[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handlePaymentUpdate}
            disabled={savingPayment}
          >
            {savingPayment ? 'Atualizando...' : 'Atualizar pagamento'}
          </button>
        </div>

        <div className="admin-status-form">
          <label htmlFor={`delivery-${order.id}`}>Entrega</label>
          <select
            id={`delivery-${order.id}`}
            value={deliveryStatus}
            onChange={(event) =>
              setDeliveryStatus(event.target.value as DeliveryStatus)
            }
          >
            {deliveryOptions.map((status) => (
              <option key={status} value={status}>
                {deliveryStatusLabels[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleDeliveryUpdate}
            disabled={savingDelivery}
          >
            {savingDelivery ? 'Atualizando...' : 'Atualizar entrega'}
          </button>
        </div>
      </div>

      {feedback ? (
        <p className="admin-feedback" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
