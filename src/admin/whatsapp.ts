import { formatPhone, onlyDigits } from '../lib/checkout-validation'

export interface AdminWhatsAppContact {
  number: string
  display: string
  url: string
}

export function normalizeBrazilianWhatsAppNumber(
  value: string | null | undefined,
): string | null {
  const digits = onlyDigits(value ?? '')

  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    return digits
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return null
  }

  const ddd = Number(digits.slice(0, 2))

  if (ddd < 11 || ddd > 99) {
    return null
  }

  return `55${digits}`
}

export function buildAdminWhatsAppMessage(customerName: string): string {
  return `Olá, ${customerName}! Tudo bem? 😊

Aqui é da Nahla Aya! Gostaríamos de agradecer pela sua compra em nossa loja. Ficamos muito felizes em ter você como cliente!

Qualquer dúvida ou necessidade, estamos à disposição. Muito obrigado pela confiança! 💚`
}

export function buildAdminWhatsAppContact(
  customerName: string,
  phone: string | null | undefined,
): AdminWhatsAppContact | null {
  const name = customerName.trim()
  const number = normalizeBrazilianWhatsAppNumber(phone)

  if (!name || !number) {
    return null
  }

  const nationalDigits = number.startsWith('55') && number.length > 11
    ? number.slice(2)
    : number

  return {
    number,
    display: formatPhone(nationalDigits),
    url: `https://wa.me/${number}?text=${encodeURIComponent(
      buildAdminWhatsAppMessage(name),
    )}`,
  }
}
