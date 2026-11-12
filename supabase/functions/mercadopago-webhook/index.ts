import {
  HttpError,
  jsonResponse,
} from '../_shared/http.ts'
import {
  approvedRefundTotalCents,
  buildPaymentEventDedupeKey,
  buildRefundEventReference,
  decidePaymentConfirmation,
  getMercadoPagoPayment,
  getMercadoPagoRefunds,
  type MercadoPagoRefund,
  mapMercadoPagoPaymentState,
  paymentMatchesOrder,
  readMercadoPagoNotificationId,
  readMercadoPagoPaymentId,
  verifyMercadoPagoWebhookSignature,
} from '../_shared/mercadopago.ts'
import { requireMercadoPagoConfig } from '../_shared/mercadopago-credentials.ts'
import { getServiceClient } from '../_shared/supabase.ts'

interface OrderPaymentRow {
  id: number
  payment_status: string
  total_cents: number
}

interface WebhookEventRow {
  id: string
  status: string
}

interface WebhookClaimResult {
  claimed?: boolean
  event?: WebhookEventRow | null
}

type ServiceClient = ReturnType<typeof getServiceClient>

async function completeNotification(
  client: ServiceClient,
  eventId: string,
  status: 'processed' | 'reconciliation_required' | 'failed',
  orderId: number | null = null,
  lastError: string | null = null,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    last_error: lastError,
    updated_at: new Date().toISOString(),
    processed_at:
      status === 'processed' || status === 'reconciliation_required'
        ? new Date().toISOString()
        : null,
  }

  if (orderId !== null) {
    updates.order_id = orderId
  }

  const { error } = await client
    .from('payment_webhook_events')
    .update(updates)
    .eq('id', eventId)

  if (error) {
    throw new HttpError(503, 'Não foi possível atualizar a notificação.')
  }
}

async function recordApprovedReconciliation(
  client: ServiceClient,
  orderId: number,
  paymentId: string,
  amountCents: number,
): Promise<void> {
  const { error } = await client.from('order_payment_events').upsert(
    {
      order_id: orderId,
      provider: 'mercadopago',
      provider_event_id: `mercadopago:reconciliation:${paymentId}`,
      status: 'approved_reconciliation_required',
      amount_cents: amountCents,
    },
    { onConflict: 'provider_event_id' },
  )

  if (error) {
    throw new HttpError(503, 'Não foi possível registrar a reconciliação.')
  }
}

async function recordRefundReconciliation(
  client: ServiceClient,
  order: OrderPaymentRow,
  paymentId: string,
  claimId: string,
  state: 'refunded' | 'chargeback',
  refunds: readonly MercadoPagoRefund[],
): Promise<void> {
  const events =
    state === 'refunded' && refunds.length > 0
      ? refunds.map((refund) => ({
          order_id: order.id,
          provider: 'mercadopago',
          provider_event_id: buildRefundEventReference(
            paymentId,
            refund.id,
            refund.status,
          ),
          status: refund.status ?? 'unknown',
          amount_cents: refund.amountCents,
        }))
      : [
          {
            order_id: order.id,
            provider: 'mercadopago',
            provider_event_id: `mercadopago:${state}-status:${claimId}`,
            status: state,
            amount_cents: order.total_cents,
          },
        ]

  const { error: eventError } = await client
    .from('order_payment_events')
    .upsert(events, { onConflict: 'provider_event_id' })

  if (eventError) {
    throw new HttpError(503, 'Não foi possível registrar o reembolso.')
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    payment_reconciliation_status:
      state === 'refunded' ? 'refund_review' : 'chargeback_review',
    payment_reconciliation_updated_at: now,
  }

  if (state === 'refunded') {
    updates.refunded_at = now
    if (refunds.length > 0) {
      updates.refunded_amount_cents = approvedRefundTotalCents(refunds)
    }
  } else {
    updates.chargeback_at = now
  }

  const { error: orderError } = await client
    .from('orders')
    .update(updates)
    .eq('id', order.id)

  if (orderError) {
    throw new HttpError(503, 'Não foi possível registrar a reconciliação do pedido.')
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Método não permitido.' }, 405)
  }

  let client: ServiceClient | null = null
  let eventId: string | null = null

  try {
    client = getServiceClient()
    const config = await requireMercadoPagoConfig(client)
    const raw = await request.text()

    if (raw.length > 8_192) {
      throw new HttpError(413, 'Requisição muito grande.')
    }

    let body: Record<string, unknown>

    try {
      body = JSON.parse(raw) as Record<string, unknown>
    } catch {
      throw new HttpError(400, 'Dados inválidos.')
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new HttpError(400, 'Dados inválidos.')
    }

    if (body.type !== 'payment') {
      return jsonResponse({ received: true, ignored: true }, 200)
    }

    const paymentId = readMercadoPagoPaymentId(new URL(request.url))
    const requestId = request.headers.get('x-request-id')
    const providerNotificationId = readMercadoPagoNotificationId(body)

    const validSignature = await verifyMercadoPagoWebhookSignature(
      config.webhookSecret,
      paymentId,
      requestId,
      request.headers.get('x-signature'),
    )

    if (!validSignature) {
      throw new HttpError(401, 'Assinatura do webhook inválida.')
    }

    const payment = await getMercadoPagoPayment(config, paymentId)
    const externalReference = Number(payment.external_reference)

    if (!Number.isSafeInteger(externalReference) || externalReference <= 0) {
      throw new HttpError(422, 'Pagamento sem referência de pedido.')
    }

    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select('id,payment_status,total_cents')
      .eq('id', externalReference)
      .maybeSingle()

    if (orderError) {
      throw new HttpError(503, 'Não foi possível consultar o pedido.')
    }

    if (!orderData) {
      throw new HttpError(404, 'Pedido não encontrado.')
    }

    const order = orderData as OrderPaymentRow

    if (!paymentMatchesOrder(payment, order.id, order.total_cents)) {
      throw new HttpError(409, 'Pagamento não corresponde ao pedido.')
    }

    const state = mapMercadoPagoPaymentState(String(payment.status ?? 'pending'))
    const refunds =
      state === 'refunded'
        ? await getMercadoPagoRefunds(config, paymentId)
        : []
    const claimId = buildPaymentEventDedupeKey(paymentId, state, refunds)

    const claim = await client.rpc('claim_payment_webhook_event', {
      p_provider: 'mercadopago',
      p_notification_id: claimId,
      p_provider_notification_id: providerNotificationId,
      p_payment_id: paymentId,
      p_event_type: String(body.type),
    })

    if (claim.error) {
      throw new HttpError(503, 'Não foi possível registrar a notificação.')
    }

    const claimData = (claim.data ?? {}) as WebhookClaimResult
    const claimedEvent = claimData.event

    if (!claimData.claimed) {
      if (
        claimedEvent?.status === 'processed' ||
        claimedEvent?.status === 'reconciliation_required'
      ) {
        return jsonResponse({ received: true, alreadyProcessed: true }, 200)
      }

      return jsonResponse(
        {
          received: false,
          processing: claimedEvent?.status === 'processing',
          retry: true,
        },
        503,
        { 'Retry-After': '30' },
      )
    }

    if (!claimedEvent?.id) {
      throw new HttpError(503, 'Notificação sem identificador interno.')
    }

    eventId = claimedEvent.id

    if (state === 'refunded' || state === 'chargeback') {
      await recordRefundReconciliation(
        client,
        order,
        paymentId,
        claimId,
        state,
        refunds,
      )
      await completeNotification(
        client,
        eventId,
        'reconciliation_required',
        order.id,
      )

      return jsonResponse(
        {
          received: true,
          paid: false,
          reconciliationRequired: true,
          status: state,
        },
        200,
      )
    }

    if (order.payment_status === 'paid') {
      await completeNotification(client, eventId, 'processed', order.id)
      return jsonResponse({ received: true, alreadyPaid: true }, 200)
    }

    if (state === 'pending') {
      await completeNotification(client, eventId, 'processed', order.id)
      return jsonResponse({ received: true, pending: true }, 200)
    }

    if (state === 'paid') {
      if (order.payment_status === 'cancelled' || order.payment_status === 'failed') {
        await recordApprovedReconciliation(
          client,
          order.id,
          paymentId,
          order.total_cents,
        )
        await completeNotification(
          client,
          eventId,
          'reconciliation_required',
          order.id,
        )

        return jsonResponse(
          {
            received: true,
            paid: false,
            reconciliationRequired: true,
            reason: 'order_not_pending',
          },
          200,
        )
      }

      const { data: confirmation, error } = await client.rpc(
        'confirm_order_payment',
        {
          p_order_id: order.id,
          p_provider: 'mercadopago',
          p_reference: `mercadopago:${paymentId}`,
        },
      )
      const decision = decidePaymentConfirmation(error, confirmation)

      if (decision.kind === 'error') {
        throw new HttpError(409, decision.message)
      }

      if (decision.kind === 'paid') {
        await completeNotification(client, eventId, 'processed', order.id)
        return jsonResponse({ received: true, paid: true }, 200)
      }

      await recordApprovedReconciliation(
        client,
        order.id,
        paymentId,
        order.total_cents,
      )
      await completeNotification(
        client,
        eventId,
        'reconciliation_required',
        order.id,
      )

      return jsonResponse(
        {
          received: true,
          paid: false,
          reconciliationRequired: true,
          reason: decision.reason,
        },
        200,
      )
    }

    if (state === 'cancelled') {
      const { error } = await client
        .from('orders')
        .update({
          payment_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('payment_status', 'pending')

      if (error) {
        throw new HttpError(409, 'Não foi possível cancelar o pedido.')
      }

      await completeNotification(client, eventId, 'processed', order.id)
      return jsonResponse({ received: true, cancelled: true }, 200)
    }

    const { error } = await client.rpc('mark_order_payment_failed', {
      p_order_id: order.id,
      p_terminal: true,
    })

    if (error) {
      throw new HttpError(409, error.message)
    }

    await completeNotification(client, eventId, 'processed', order.id)
    return jsonResponse({ received: true, failed: true }, 200)
  } catch (error) {
    if (client && eventId) {
      await completeNotification(
        client,
        eventId,
        'failed',
        null,
        'Falha no processamento da notificação.',
      ).catch(() => undefined)
    }

    const status = error instanceof HttpError ? error.status : 500
    const message =
      error instanceof Error ? error.message : 'Webhook não processado.'

    return jsonResponse({ message }, status)
  }
})
