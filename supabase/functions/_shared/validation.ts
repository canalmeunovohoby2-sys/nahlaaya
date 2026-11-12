type PaymentMethod = 'pix' | 'debit' | 'credit'

export interface NormalizedCheckoutItem {
  productId: string
  quantity: number
}

export interface NormalizedCheckoutPayload {
  buyer: {
    fullName: string
    cpf: string
    email: string
    phone: string
  }
  address: {
    cep: string
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
  }
  paymentMethod: PaymentMethod
  items: NormalizedCheckoutItem[]
  shippingServiceId: string | null
}

const states = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
])

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function validCpf(value: string): boolean {
  const digits = onlyDigits(value)

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false
  }

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index)
  }

  let first = (sum * 10) % 11
  if (first === 10) first = 0
  if (first !== Number(digits[9])) return false

  sum = 0
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index)
  }

  let second = (sum * 10) % 11
  if (second === 10) second = 0

  return second === Number(digits[10])
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Informe ${label}.`)
  }

  return value.trim()
}

export function normalizeCheckoutPayload(raw: unknown): NormalizedCheckoutPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dados do pedido inválidos.')
  }

  const payload = raw as Record<string, unknown>
  const buyer = payload.buyer
  const address = payload.address

  if (!buyer || typeof buyer !== 'object') {
    throw new Error('Dados do comprador inválidos.')
  }

  if (!address || typeof address !== 'object') {
    throw new Error('Endereço de entrega inválido.')
  }

  const buyerData = buyer as Record<string, unknown>
  const addressData = address as Record<string, unknown>
  const fullName = text(buyerData.fullName, 'o nome completo')
  const cpf = text(buyerData.cpf, 'o CPF')
  const email = text(buyerData.email, 'o e-mail')
  const phone = text(buyerData.phone, 'o telefone')
  const cep = text(addressData.cep, 'o CEP')
  const street = text(addressData.street, 'a rua')
  const number = text(addressData.number, 'o número')
  const neighborhood = text(addressData.neighborhood, 'o bairro')
  const city = text(addressData.city, 'a cidade')
  const state = text(addressData.state, 'o estado').toUpperCase()
  const paymentMethod = payload.paymentMethod
  const shippingServiceId =
    typeof payload.shippingServiceId === 'string'
      ? payload.shippingServiceId.trim()
      : ''

  if (shippingServiceId.length > 100) {
    throw new Error('Opção de frete inválida.')
  }

  if (fullName.length < 3) throw new Error('Nome incompleto.')
  if (!validCpf(cpf)) throw new Error('CPF inválido.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.')
  if (![10, 11].includes(onlyDigits(phone).length)) {
    throw new Error('Telefone inválido.')
  }
  if (onlyDigits(cep).length !== 8) throw new Error('CEP inválido.')
  if (!states.has(state)) throw new Error('UF inválida.')
  if (paymentMethod !== 'pix' && paymentMethod !== 'debit' && paymentMethod !== 'credit') {
    throw new Error('Forma de pagamento inválida.')
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('A sacola está vazia.')
  }

  const quantities = new Map<string, number>()

  for (const rawItem of payload.items) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new Error('Item inválido.')
    }

    const item = rawItem as Record<string, unknown>
    const productId = item.productId
    const quantity = item.quantity

    if (typeof productId !== 'string' || productId.length === 0) {
      throw new Error('Produto inválido.')
    }

    if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error('Quantidade inválida.')
    }

    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
  }

  if (quantities.size > 50) throw new Error('Itens demais no pedido.')

  return {
    buyer: {
      fullName,
      cpf: onlyDigits(cpf),
      email: email.toLowerCase(),
      phone: onlyDigits(phone),
    },
    address: {
      cep: onlyDigits(cep),
      street,
      number,
      complement:
        typeof addressData.complement === 'string'
          ? addressData.complement.trim()
          : '',
      neighborhood,
      city,
      state,
    },
    paymentMethod,
    items: [...quantities.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
    shippingServiceId: shippingServiceId || null,
  }
}
