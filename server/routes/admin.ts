import { Router } from 'express'
import { HttpError } from '../services/store'
import {
  getDashboard,
  getOrderDetail,
  listCustomers,
  listOrders,
  listProducts,
  updateDeliveryStatus,
  updatePaymentStatus,
  updateProduct,
} from '../services/store'

export const adminRouter = Router()

function parseId(value: string): number {
  const id = Number(value)

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, 'Identificador inválido.')
  }

  return id
}

adminRouter.get('/dashboard', (_req, res) => {
  res.json(getDashboard())
})

adminRouter.get('/products', (_req, res) => {
  res.json({ products: listProducts() })
})

adminRouter.patch('/products/:id', (req, res) => {
  const product = updateProduct(req.params.id, req.body ?? {})

  if (!product) {
    throw new HttpError(404, 'Produto não encontrado.')
  }

  res.json({ product })
})

adminRouter.get('/orders', (req, res) => {
  const limit =
    typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined
  const safeLimit =
    typeof limit === 'number' && Number.isSafeInteger(limit)
      ? Math.min(Math.max(limit, 1), 200)
      : 100

  res.json({ orders: listOrders(safeLimit) })
})

adminRouter.get('/orders/:id', (req, res) => {
  res.json({ order: getOrderDetail(parseId(req.params.id)) })
})

adminRouter.patch('/orders/:id/payment', (req, res) => {
  const order = updatePaymentStatus(
    parseId(req.params.id),
    req.body?.status,
  )
  res.json({ order })
})

adminRouter.patch('/orders/:id/delivery', (req, res) => {
  const order = updateDeliveryStatus(
    parseId(req.params.id),
    req.body?.status,
  )
  res.json({ order })
})

adminRouter.get('/customers', (_req, res) => {
  res.json({ customers: listCustomers() })
})
