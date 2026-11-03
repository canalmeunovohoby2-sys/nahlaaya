import { formatCurrency } from '../lib/format'
import { formatCpf, formatPhone } from '../lib/checkout-validation'
import type {
  DeliveryStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types/admin'

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'Pix',
  debit: 'Débito',
  credit: 'Crédito em 3x',
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago',
  cancelled: 'Cancelado',
  failed: 'Falhou',
}

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  pending: 'Aguardando',
  preparing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export function formatCents(cents: number): string {
  return formatCurrency(cents / 100)
}

export function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function formatCpfDisplay(value: string): string {
  return formatCpf(value)
}

export function formatPhoneDisplay(value: string): string {
  return formatPhone(value)
}

export function statusTone(status: string): string {
  return `admin-status admin-status--${status.replace(/_/g, '-')}`
}
