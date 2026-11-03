import { Router } from 'express'
import { createOrder } from '../services/store'
import type { CheckoutPayload } from '../../src/types/checkout'

export const publicOrdersRouter = Router()

publicOrdersRouter.post('/', (req, res) => {
  const order = createOrder(req.body as CheckoutPayload)

  res.status(201).json({
    status: 'pending-payment',
    message:
      'Pedido registrado. O pagamento está pendente. O estoque será baixado somente após a confirmação do pagamento.',
    order,
  })
})
