import { randomBytes } from 'node:crypto'
import { db } from '../db'
import {
  brazilianStates,
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
} from '../../src/lib/checkout-validation'
import type {
  CheckoutItem,
  CheckoutPayload,
  PaymentMethod,
} from '../../src/types/checkout'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface ProductRow {
  id: string
  slug: string
  name: string
  brand: string
  volume_ml: number
  concentration: string
  pix_price_cents: number
  debit_price_cents: number
  installment_total_cents: number
  stock: number
  active: number
  category: string | null
  images_json: string
  created_at: string
  updated_at: string
}

interface CustomerRow {
  id: number
  full_name: string
  cpf: string
  email: string
  phone: string
  created_at: string
  updated_at: string
}

interface OrderRow {
  id: number
  order_number: string
  customer_id: number
  address_id: number
  payment_method: PaymentMethod
  subtotal_pix_cents: number
  subtotal_debit_cents: number
  installment_total_cents: number
  selected_total_cents: number
  shipping_total_cents: number | null
  total_cents: number
  payment_status: string
  delivery_status: string
  created_at: string
  updated_at: string
  paid_at: string | null
  cancelled_at: string | null
}

interface OrderItemRow {
  id: number
  product_id: string
  product_name: string
  brand: string
  quantity: number
  unit_pix_cents: number
  unit_debit_cents: number
  unit_installment_cents: number
  line_pix_cents: number
  line_debit_cents: number
  line_installment_cents: number
}

interface OrderWithCustomerRow extends OrderRow {
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_cpf: string
}

const selectProduct = db.prepare('SELECT * FROM products WHERE id = ?')
const selectCustomerByEmail = db.prepare(
  'SELECT * FROM customers WHERE email = ?',
)
const selectCustomerByCpf = db.prepare('SELECT * FROM customers WHERE cpf = ?')

const insertCustomer = db.prepare(`
  INSERT INTO customers (full_name, cpf, email, phone)
  VALUES (?, ?, ?, ?)
`)
const updateCustomer = db.prepare(`
  UPDATE customers
  SET full_name = ?, email = ?, phone = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = ?
`)

const insertAddress = db.prepare(`
  INSERT INTO addresses (customer_id, cep, street, number, complement, neighborhood, city, state)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const insertOrder = db.prepare(`
  INSERT INTO orders (
    order_number, customer_id, address_id, payment_method,
    subtotal_pix_cents, subtotal_debit_cents, installment_total_cents,
    selected_total_cents, shipping_total_cents, total_cents
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
`)

const insertOrderItem = db.prepare(`
  INSERT INTO order_items (
    order_id, product_id, product_name, brand, quantity,
    unit_pix_cents, unit_debit_cents, unit_installment_cents,
    line_pix_cents, line_debit_cents, line_installment_cents
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

function now(): string {
  return new Date().toISOString()
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  if (value === 'pix' || value === 'debit' || value === 'credit') {
    return value
  }

  throw new HttpError(400, 'Forma de pagamento inválida.')
}

function requireText(value: unknown, label: string, minLength = 1): string {
  if (typeof value !== 'string' || value.trim().length < minLength) {
    throw new HttpError(400, `Informe ${label}.`)
  }

  return value.trim()
}

function validateAndNormalizeItems(rawItems: unknown): CheckoutItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'A sacola está vazia.')
  }

  if (rawItems.length > 50) {
    throw new HttpError(400, 'Quantidade de itens inválida.')
  }

  const quantities = new Map<string, number>()

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new HttpError(400, 'Item inválido.')
    }

    const item = rawItem as { productId?: unknown; quantity?: unknown }

    if (typeof item.productId !== 'string' || item.productId.length === 0) {
      throw new HttpError(400, 'Produto inválido.')
    }

    if (
      typeof item.quantity !== 'number' ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new HttpError(400, 'Quantidade inválida.')
    }

    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    )
  }

  return [...quantities.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }))
}

function normalizePayload(payload: CheckoutPayload): CheckoutPayload {
  if (!payload || typeof payload !== 'object') {
    throw new HttpError(400, 'Dados do pedido inválidos.')
  }

  const buyer = payload.buyer
  const address = payload.address

  if (!buyer || typeof buyer !== 'object') {
    throw new HttpError(400, 'Dados do comprador inválidos.')
  }

  if (!address || typeof address !== 'object') {
    throw new HttpError(400, 'Endereço de entrega inválido.')
  }

  const fullName = requireText(buyer.fullName, 'o nome completo', 3)
  const cpf = requireText(buyer.cpf, 'o CPF')
  const email = requireText(buyer.email, 'o e-mail')
  const phone = requireText(buyer.phone, 'o telefone')
  const cep = requireText(address.cep, 'o CEP')
  const street = requireText(address.street, 'a rua')
  const number = requireText(address.number, 'o número')
  const neighborhood = requireText(address.neighborhood, 'o bairro')
  const city = requireText(address.city, 'a cidade')
  const state = requireText(address.state, 'o estado').toUpperCase()

  if (!isValidCpf(cpf)) {
    throw new HttpError(400, 'CPF inválido.')
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, 'E-mail inválido.')
  }

  if (!isValidPhone(phone)) {
    throw new HttpError(400, 'Telefone inválido.')
  }

  if (!isValidCep(cep)) {
    throw new HttpError(400, 'CEP inválido.')
  }

  if (!brazilianStates.includes(state)) {
    throw new HttpError(400, 'UF inválida.')
  }

  return {
    buyer: {
      fullName,
      cpf: cpf.replace(/\D/g, ''),
      email: email.toLowerCase(),
      phone: phone.replace(/\D/g, ''),
    },
    address: {
      cep: cep.replace(/\D/g, ''),
      street,
      number,
      complement:
        typeof address.complement === 'string' ? address.complement.trim() : '',
      neighborhood,
      city,
      state,
    },
    paymentMethod: normalizePaymentMethod(payload.paymentMethod),
    items: validateAndNormalizeItems(payload.items),
  }
}

export function createOrder(rawPayload: CheckoutPayload) {
  const payload = normalizePayload(rawPayload)
  const items: Array<{
    product: ProductRow
    quantity: number
    unitPix: number
    unitDebit: number
    unitInstallment: number
  }> = []

  for (const item of payload.items) {
    const product = selectProduct.get(item.productId) as ProductRow | undefined

    if (!product || !product.active) {
      throw new HttpError(409, `Produto indisponível: ${item.productId}.`)
    }

    if (product.stock < item.quantity) {
      throw new HttpError(
        409,
        `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}.`,
      )
    }

    const unitPix = Math.round(product.installment_total_cents * 0.9)

    items.push({
      product,
      quantity: item.quantity,
      unitPix,
      unitDebit: product.debit_price_cents,
      unitInstallment: product.installment_total_cents,
    })
  }

  const subtotalPix = items.reduce(
    (total, item) => total + item.unitPix * item.quantity,
    0,
  )
  const subtotalDebit = items.reduce(
    (total, item) => total + item.unitDebit * item.quantity,
    0,
  )
  const installmentTotal = items.reduce(
    (total, item) => total + item.unitInstallment * item.quantity,
    0,
  )
  const selectedTotal =
    payload.paymentMethod === 'debit'
      ? subtotalDebit
      : payload.paymentMethod === 'credit'
        ? installmentTotal
        : subtotalPix

  const orderNumber = `NA-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`

  db.exec('BEGIN IMMEDIATE')

  try {
    const existingByEmail = selectCustomerByEmail.get(
      payload.buyer.email,
    ) as CustomerRow | undefined
    const existingByCpf = selectCustomerByCpf.get(
      payload.buyer.cpf,
    ) as CustomerRow | undefined

    let customerId: number

    if (existingByEmail) {
      customerId = existingByEmail.id
      updateCustomer.run(
        payload.buyer.fullName,
        payload.buyer.email,
        payload.buyer.phone,
        customerId,
      )
    } else if (existingByCpf) {
      customerId = existingByCpf.id
      updateCustomer.run(
        payload.buyer.fullName,
        payload.buyer.email,
        payload.buyer.phone,
        customerId,
      )
    } else {
      const result = insertCustomer.run(
        payload.buyer.fullName,
        payload.buyer.cpf,
        payload.buyer.email,
        payload.buyer.phone,
      )
      customerId = Number(result.lastInsertRowid)
    }

    const addressResult = insertAddress.run(
      customerId,
      payload.address.cep,
      payload.address.street,
      payload.address.number,
      payload.address.complement,
      payload.address.neighborhood,
      payload.address.city,
      payload.address.state,
    )
    const addressId = Number(addressResult.lastInsertRowid)

    const orderResult = insertOrder.run(
      orderNumber,
      customerId,
      addressId,
      payload.paymentMethod,
      subtotalPix,
      subtotalDebit,
      installmentTotal,
      selectedTotal,
      selectedTotal,
    )
    const orderId = Number(orderResult.lastInsertRowid)

    for (const item of items) {
      insertOrderItem.run(
        orderId,
        item.product.id,
        item.product.name,
        item.product.brand,
        item.quantity,
        item.unitPix,
        item.unitDebit,
        item.unitInstallment,
        item.unitPix * item.quantity,
        item.unitDebit * item.quantity,
        item.unitInstallment * item.quantity,
      )
    }

    db.exec('COMMIT')

    return {
      id: orderId,
      orderNumber,
      paymentMethod: payload.paymentMethod,
      paymentStatus: 'pending',
      deliveryStatus: 'pending',
      subtotalPixCents: subtotalPix,
      subtotalDebitCents: subtotalDebit,
      installmentTotalCents: installmentTotal,
      selectedTotalCents: selectedTotal,
      shippingTotalCents: null,
      totalCents: selectedTotal,
      createdAt: now(),
    }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function listProducts() {
  const rows = db
    .prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE ASC')
    .all() as unknown as ProductRow[]

  return rows.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    volumeMl: product.volume_ml,
    concentration: product.concentration,
    pixPriceCents: product.pix_price_cents,
    debitPriceCents: product.debit_price_cents,
    installmentTotalCents: product.installment_total_cents,
    stock: product.stock,
    active: Boolean(product.active),
    category: product.category,
    images: JSON.parse(product.images_json) as string[],
    updatedAt: product.updated_at,
  }))
}

export function updateProduct(
  productId: string,
  input: { stock?: unknown; active?: unknown },
) {
  const current = selectProduct.get(productId) as ProductRow | undefined

  if (!current) {
    throw new HttpError(404, 'Produto não encontrado.')
  }

  const stock =
    input.stock === undefined
      ? current.stock
      : typeof input.stock === 'number' &&
          Number.isSafeInteger(input.stock) &&
          input.stock >= 0
        ? input.stock
        : null

  if (stock === null) {
    throw new HttpError(400, 'Estoque inválido.')
  }

  const active =
    input.active === undefined
      ? Boolean(current.active)
      : typeof input.active === 'boolean'
        ? input.active
        : null

  if (active === null) {
    throw new HttpError(400, 'Situação do produto inválida.')
  }

  db.prepare(
    "UPDATE products SET stock = ?, active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  ).run(stock, active ? 1 : 0, productId)

  return listProducts().find((product) => product.id === productId)
}

export function listOrders(limit = 100) {
  return db
    .prepare(
      `SELECT
        o.id, o.order_number, o.payment_method, o.total_cents,
        o.payment_status, o.delivery_status, o.created_at,
        c.full_name AS customer_name, c.email AS customer_email
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC
      LIMIT ?`,
    )
    .all(limit)
}

export function getOrderDetail(orderId: number) {
  const order = db
    .prepare(
      `SELECT
        o.*, c.full_name AS customer_name, c.email AS customer_email,
        c.phone AS customer_phone, c.cpf AS customer_cpf,
        a.cep, a.street, a.number, a.complement, a.neighborhood, a.city, a.state
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      JOIN addresses a ON a.id = o.address_id
      WHERE o.id = ?`,
    )
    .get(orderId) as
    | (OrderWithCustomerRow & {
        cep: string
        street: string
        number: string
        complement: string
        neighborhood: string
        city: string
        state: string
      })
    | undefined

  if (!order) {
    throw new HttpError(404, 'Pedido não encontrado.')
  }

  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC')
    .all(orderId) as unknown as OrderItemRow[]

  return { ...order, items }
}

export function updatePaymentStatus(orderId: number, status: unknown) {
  if (!['pending', 'paid', 'cancelled'].includes(String(status))) {
    throw new HttpError(400, 'Status de pagamento inválido.')
  }

  const nextStatus = String(status)
  const order = getOrderDetail(orderId)
  const currentStatus = order.payment_status

  if (currentStatus === 'paid' && nextStatus !== 'paid') {
    throw new HttpError(409, 'Pedidos pagos não podem ser alterados para este status.')
  }

  if (currentStatus === 'cancelled' && nextStatus !== 'cancelled') {
    throw new HttpError(409, 'Pedidos cancelados não podem ser reabertos.')
  }

  db.exec('BEGIN IMMEDIATE')

  try {
    if (nextStatus === 'paid' && currentStatus !== 'paid') {
      for (const item of order.items) {
        const result = db
          .prepare(
            "UPDATE products SET stock = stock - ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND stock >= ?",
          )
          .run(item.quantity, item.product_id, item.quantity)

        if (Number(result.changes) === 0) {
          throw new HttpError(
            409,
            `Estoque insuficiente para confirmar o pagamento de ${item.product_name}.`,
          )
        }
      }
    }

    db.prepare(
      `UPDATE orders SET
        payment_status = ?,
        paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END,
        cancelled_at = CASE WHEN ? = 'cancelled' THEN ? ELSE cancelled_at END,
        updated_at = ?
      WHERE id = ?`,
    ).run(
      nextStatus,
      nextStatus,
      now(),
      nextStatus,
      now(),
      now(),
      orderId,
    )

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getOrderDetail(orderId)
}

export function updateDeliveryStatus(orderId: number, status: unknown) {
  const allowed = [
    'pending',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
  ]

  if (!allowed.includes(String(status))) {
    throw new HttpError(400, 'Status de entrega inválido.')
  }

  const order = getOrderDetail(orderId)

  if (order.payment_status === 'cancelled' && status !== 'cancelled') {
    throw new HttpError(
      409,
      'Pedidos com pagamento cancelado não podem avançar na entrega.',
    )
  }

  db.prepare(
    "UPDATE orders SET delivery_status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  ).run(String(status), orderId)

  return getOrderDetail(orderId)
}

export function getDashboard() {
  const revenue = db
    .prepare(
      "SELECT COALESCE(SUM(total_cents), 0) AS revenue FROM orders WHERE payment_status = 'paid'",
    )
    .get() as { revenue: number }

  const counts = db
    .prepare(
      `SELECT
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN payment_status = 'cancelled' OR delivery_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
      FROM orders`,
    )
    .get() as {
    pending_count: number
    paid_count: number
    cancelled_count: number
  }

  const recentOrders = listOrders(8)

  return {
    revenueCents: revenue.revenue,
    pendingPaymentCount: counts.pending_count ?? 0,
    paidOrderCount: counts.paid_count ?? 0,
    cancelledOrderCount: counts.cancelled_count ?? 0,
    soldItemCount: counts.paid_count ?? 0,
    recentOrders,
  }
}

export function listCustomers() {
  return db
    .prepare(
      `SELECT
        c.id, c.full_name, c.cpf, c.email, c.phone, c.created_at,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_cents ELSE 0 END), 0) AS paid_total_cents
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
    )
    .all()
}
