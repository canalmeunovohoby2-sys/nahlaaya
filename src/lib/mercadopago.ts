const FINAL_STATUSES = new Set([
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'failed',
])

export function isFinalMercadoPagoStatus(status: string): boolean {
  return FINAL_STATUSES.has(status.toLowerCase())
}

export function getPixQrImageSource(value: string | null): string | null {
  if (!value?.trim()) {
    return null
  }

  return value.startsWith('data:')
    ? value
    : `data:image/png;base64,${value}`
}

export function getMercadoPagoStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'Pagamento aprovado'
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'Aguardando pagamento'
    case 'rejected':
      return 'Pagamento recusado'
    case 'cancelled':
      return 'Pagamento cancelado'
    case 'refunded':
      return 'Pagamento reembolsado'
    case 'charged_back':
      return 'Pagamento contestado'
    case 'failed':
      return 'Falha no pagamento'
    default:
      return 'Pagamento em processamento'
  }
}

export async function copyTextToClipboard(value: string): Promise<void> {
  if (!value.trim()) {
    return
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error('Não foi possível copiar o código neste navegador.')
  }

  await navigator.clipboard.writeText(value)
}
