import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  approvedRefundTotalCents,
  buildMercadoPagoPaymentPayload,
  buildPaymentEventDedupeKey,
  buildPublicPaymentResponse,
  buildRefundEventReference,
  extractPixPaymentData,
  classifyPaymentConfirmation,
  constantTimeEqualHex,
  decidePaymentConfirmation,
  getMercadoPagoRefunds,
  mapMercadoPagoPaymentState,
  paymentMatchesOrder,
  readMercadoPagoNotificationId,
  readMercadoPagoPaymentId,
  verifyMercadoPagoWebhookSignature,
} from '../supabase/functions/_shared/mercadopago.ts'
import {
  summarizeMercadoPagoSettings,
  type MercadoPagoSettingsRow,
} from '../supabase/functions/_shared/mercadopago-credentials.ts'
import {
  decryptSecret,
  encryptSecret,
} from '../supabase/functions/_shared/secret-crypto.ts'
import { getMercadoPagoStatusLabel, getPixQrImageSource, isFinalMercadoPagoStatus } from '../src/lib/mercadopago.ts'
import {
  signOrderAccessToken,
  verifyOrderAccessToken,
} from '../supabase/functions/_shared/order-access.ts'

const webhookUrl = 'https://example.supabase.co/functions/v1/mercadopago-webhook'

const pixOrder = {
  id: 42,
  orderNumber: 'NA-20261112-000042',
  paymentMethod: 'pix' as const,
  totalCents: 10000,
  buyerEmail: 'cliente@example.com',
  buyerCpf: '52998224725',
  description: 'Pedido NA-20261112-000042 — Nahla Aya',
}

function env(values: Record<string, string>) {
  return {
    get(key: string) {
      return values[key]
    },
  }
}

const encryptionEnv = env({
  MERCADO_PAGO_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
})

function settingsRow(overrides: Partial<MercadoPagoSettingsRow> = {}): MercadoPagoSettingsRow {
  return {
    public_key: null,
    access_token_ciphertext: null,
    access_token_iv: null,
    access_token_tag: null,
    webhook_secret_ciphertext: null,
    webhook_secret_iv: null,
    webhook_secret_tag: null,
    validation_status: 'pending',
    validation_message: null,
    validated_at: null,
    ...overrides,
  }
}

test('credenciais são criptografadas com AES-GCM e preservam integridade', async () => {
  const encrypted = await encryptSecret('unit-test-secret', encryptionEnv)

  assert.notEqual(encrypted.ciphertext, 'unit-test-secret')
  assert.equal(await decryptSecret(encrypted, encryptionEnv), 'unit-test-secret')

  const tampered = {
    ...encrypted,
    ciphertext: encrypted.ciphertext.slice(0, -2) + 'AA',
  }

  await assert.rejects(() => decryptSecret(tampered, encryptionEnv))

  const wrongKey = env({
    MERCADO_PAGO_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
  })

  await assert.rejects(() => decryptSecret(encrypted, wrongKey))
})

test('sem chave mestra a criptografia permanece bloqueada', async () => {
  await assert.rejects(() => encryptSecret('unit-test-secret', env({})))
})

test('status não expõe credenciais e diferencia configuração de validação', () => {
  const empty = summarizeMercadoPagoSettings(null, encryptionEnv)

  assert.equal(empty.status, 'awaiting_credentials')
  assert.equal('accessToken' in empty, false)
  assert.equal('webhookSecret' in empty, false)

  const incomplete = summarizeMercadoPagoSettings(
    settingsRow({ public_key: 'unit-test-public-key' }),
    encryptionEnv,
  )
  assert.equal(incomplete.status, 'incomplete')

  const configured = summarizeMercadoPagoSettings(
    settingsRow({
      public_key: 'unit-test-public-key',
      access_token_ciphertext: 'a',
      access_token_iv: 'b',
      access_token_tag: 'c',
      webhook_secret_ciphertext: 'd',
      webhook_secret_iv: 'e',
      webhook_secret_tag: 'f',
    }),
    encryptionEnv,
  )
  assert.equal(configured.status, 'configured')

  const validated = summarizeMercadoPagoSettings(
    settingsRow({
      public_key: 'unit-test-public-key',
      access_token_ciphertext: 'a',
      access_token_iv: 'b',
      access_token_tag: 'c',
      webhook_secret_ciphertext: 'd',
      webhook_secret_iv: 'e',
      webhook_secret_tag: 'f',
      validation_status: 'valid',
      validated_at: '2026-11-12T00:00:00Z',
    }),
    encryptionEnv,
  )
  assert.equal(validated.status, 'validated')
})

test('Pix usa o total do pedido em reais e referência do pedido', () => {
  const payload = buildMercadoPagoPaymentPayload(pixOrder, webhookUrl)

  assert.equal(payload.transaction_amount, 100)
  assert.equal(payload.external_reference, '42')
  assert.equal(payload.payment_method_id, 'pix')
  assert.equal(payload.metadata.order_number, pixOrder.orderNumber)
  assert.equal(payload.payer.identification.number, '52998224725')
  assert.equal(payload.token, undefined)
})

test('cartão exige tokenização e respeita o limite de três parcelas', () => {
  const credit = {
    ...pixOrder,
    paymentMethod: 'credit' as const,
  }

  assert.throws(() =>
    buildMercadoPagoPaymentPayload(credit, webhookUrl),
  )

  const payload = buildMercadoPagoPaymentPayload(credit, webhookUrl, {
    token: 'unit-test-card-token',
    installments: 3,
  })

  assert.equal(payload.token, 'unit-test-card-token')
  assert.equal(payload.installments, 3)

  assert.throws(() =>
    buildMercadoPagoPaymentPayload(credit, webhookUrl, {
      token: 'unit-test-card-token',
      installments: 4,
    }),
  )

  assert.throws(() =>
    buildMercadoPagoPaymentPayload(
      { ...pixOrder, paymentMethod: 'debit' },
      webhookUrl,
      { token: 'unit-test-card-token' },
    ),
  )
})

test('status do Mercado Pago é traduzido sem aprovar estados pendentes', () => {
  assert.equal(mapMercadoPagoPaymentState('approved'), 'paid')
  assert.equal(mapMercadoPagoPaymentState('pending'), 'pending')
  assert.equal(mapMercadoPagoPaymentState('in_process'), 'pending')
  assert.equal(mapMercadoPagoPaymentState('rejected'), 'failed')
  assert.equal(mapMercadoPagoPaymentState('cancelled'), 'cancelled')
  assert.equal(mapMercadoPagoPaymentState('refunded'), 'refunded')
  assert.equal(mapMercadoPagoPaymentState('charged_back'), 'chargeback')
})

async function signatureFor(secret: string, manifest: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(manifest),
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

test('retentativas com o mesmo estado usam a mesma chave de deduplicação', () => {
  const first = buildPaymentEventDedupeKey('payment-1', 'paid')
  const retry = buildPaymentEventDedupeKey('payment-1', 'paid')

  assert.equal(first, retry)
})

test('reembolsos parciais e chargebacks têm chaves próprias', () => {
  const firstRefund = buildPaymentEventDedupeKey('payment-1', 'refunded', [
    { id: 'refund-1', amountCents: 400, status: 'approved' },
  ])
  const secondRefund = buildPaymentEventDedupeKey('payment-1', 'refunded', [
    { id: 'refund-1', amountCents: 400, status: 'approved' },
    { id: 'refund-2', amountCents: 250, status: 'approved' },
  ])
  const chargeback = buildPaymentEventDedupeKey('payment-1', 'chargeback')

  assert.notEqual(firstRefund, secondRefund)
  assert.notEqual(firstRefund, chargeback)
  assert.notEqual(chargeback, buildPaymentEventDedupeKey('payment-1', 'paid'))
})

test('cada reembolso tem referência financeira própria por status', () => {
  const first = buildRefundEventReference('payment-1', 'refund-1', 'approved')
  const second = buildRefundEventReference('payment-1', 'refund-2', 'approved')

  assert.notEqual(first, second)
  assert.equal(first, 'mercadopago:refund:payment-1:refund-1:approved')
})

test('somente reembolsos aprovados entram no total', () => {
  assert.equal(
    approvedRefundTotalCents([
      { id: 'refund-1', amountCents: 400, status: 'approved' },
      { id: 'refund-2', amountCents: 250, status: 'pending' },
      { id: 'refund-3', amountCents: 100, status: 'rejected' },
    ]),
    400,
  )
})

test('migration do webhook contém as proteções de compatibilidade', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/202611120002_mercadopago_webhook_events.sql',
    'utf8',
  )

  assert.match(migration, /add column if not exists provider_notification_id/)
  assert.match(
    migration,
    /drop function if exists public\.claim_payment_webhook_event\(text, text, text, text\)/,
  )
  assert.match(migration, /claim_payment_webhook_event\(text, text, text, text, text\)/)
})

test('Pix retorna somente os campos oficiais disponíveis', () => {
  const payment = {
    id: 123,
    status: 'pending',
    status_detail: 'pending_waiting_transfer',
    point_of_interaction: {
      transaction_data: {
        qr_code: '000201010212',
        qr_code_base64: 'base64-pix',
        ticket_url: 'https://mercadopago.example/pix',
      },
    },
    payer: { email: 'private@example.com' },
  }

  assert.deepEqual(extractPixPaymentData(payment), {
    qrCode: '000201010212',
    qrCodeBase64: 'base64-pix',
    ticketUrl: 'https://mercadopago.example/pix',
  })

  const publicResponse = buildPublicPaymentResponse(payment, '123', 'NA-1')
  assert.equal(publicResponse.qrCode, '000201010212')
  assert.equal(publicResponse.qrCodeBase64, 'base64-pix')
  assert.equal(publicResponse.ticketUrl, 'https://mercadopago.example/pix')
  assert.equal(publicResponse.status, 'pending')
  assert.equal('payer' in publicResponse, false)
})

test('Pix ausente não inventa QR ou código copia e cola', () => {
  assert.deepEqual(extractPixPaymentData({ id: 123, status: 'approved' }), {
    qrCode: null,
    qrCodeBase64: null,
    ticketUrl: null,
  })
})

test('token de acesso do pedido é assinado, vinculado e rejeita adulteração', async () => {
  const tokenEnv = env({
    ORDER_ACCESS_TOKEN_SECRET: 'unit-test-order-access-secret',
  })
  const token = await signOrderAccessToken(42, 'NA-1', tokenEnv)
  const payload = await verifyOrderAccessToken(token, tokenEnv)

  assert.equal(payload.orderId, 42)
  assert.equal(payload.orderNumber, 'NA-1')

  await assert.rejects(() =>
    verifyOrderAccessToken(token.slice(0, -1) + 'x', tokenEnv),
  )
})

test('criação e consulta de pagamento exigem token do pedido', () => {
  const createSource = fs.readFileSync(
    'supabase/functions/mercadopago-create-payment/index.ts',
    'utf8',
  )
  const statusSource = fs.readFileSync(
    'supabase/functions/mercadopago-payment-status/index.ts',
    'utf8',
  )

  assert.match(createSource, /verifyOrderAccessToken\(orderAccessToken\)/)
  assert.doesNotMatch(createSource, /body\.buyerCpf/)
  assert.match(statusSource, /verifyOrderAccessToken\(accessToken\)/)
  assert.doesNotMatch(statusSource, /body\.buyerCpf/)
})

test('rotas públicas não expõem credenciais privadas', () => {
  const publicKeySource = fs.readFileSync(
    'supabase/functions/mercadopago-public-key/index.ts',
    'utf8',
  )
  const statusSource = fs.readFileSync(
    'supabase/functions/mercadopago-payment-status/index.ts',
    'utf8',
  )

  assert.match(publicKeySource, /select\('public_key'\)/)
  assert.doesNotMatch(publicKeySource, /access_token_ciphertext/)
  assert.match(statusSource, /getMercadoPagoPayment/)
  assert.doesNotMatch(statusSource, /createMercadoPagoPayment/)
})

test('QR Pix aceita base64 e data URI sem inventar imagem', () => {
  assert.equal(getPixQrImageSource(null), null)
  assert.equal(getPixQrImageSource('abc'), 'data:image/png;base64,abc')
  assert.equal(
    getPixQrImageSource('data:image/png;base64,abc'),
    'data:image/png;base64,abc',
  )
})

test('status Pix e cartão interrompem polling apenas em estados finais', () => {
  assert.equal(isFinalMercadoPagoStatus('approved'), true)
  assert.equal(isFinalMercadoPagoStatus('rejected'), true)
  assert.equal(isFinalMercadoPagoStatus('pending'), false)
  assert.equal(isFinalMercadoPagoStatus('in_process'), false)
  assert.equal(getMercadoPagoStatusLabel('pending'), 'Aguardando pagamento')
  assert.equal(getMercadoPagoStatusLabel('approved'), 'Pagamento aprovado')
  assert.equal(getMercadoPagoStatusLabel('rejected'), 'Pagamento recusado')
})

test('lista de reembolsos é lida sem inventar identificadores', async () => {
  const refunds = await getMercadoPagoRefunds(
    {
      accessToken: 'unit-test-access',
      publicKey: null,
      webhookSecret: 'unit-test-webhook',
    },
    'payment-1',
    async () =>
      new Response(
        JSON.stringify([
          { id: 10, amount: 4, status: 'approved' },
          { id: 11, amount: 2.5, status: 'approved' },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  )

  assert.deepEqual(refunds, [
    { id: '10', amountCents: 400, status: 'approved' },
    { id: '11', amountCents: 250, status: 'approved' },
  ])
})

test('ID da notificação vem do body e é obrigatório', () => {
  assert.equal(readMercadoPagoNotificationId({ id: 123 }), '123')
  assert.equal(readMercadoPagoNotificationId({ id: 'notif-1' }), 'notif-1')
  assert.throws(() => readMercadoPagoNotificationId({}))
})

test('data.id vem exclusivamente da query e é normalizado', () => {
  const url = new URL(
    'https://example.supabase.co/functions/v1/mercadopago-webhook?data.id=ABC123&type=payment',
  )

  assert.equal(readMercadoPagoPaymentId(url), 'abc123')
  assert.throws(() => readMercadoPagoPaymentId(new URL('https://example.com/webhook')))
})

test('x-request-id ausente é omitido do manifesto', async () => {
  const secret = 'unit-test-webhook-secret'
  const ts = '1700000000'
  const manifest = `id:abc123;ts:${ts};`
  const v1 = await signatureFor(secret, manifest)

  assert.equal(
    await verifyMercadoPagoWebhookSignature(
      secret,
      'ABC123',
      null,
      `ts=${ts},v1=${v1}`,
    ),
    true,
  )
})

test('assinatura rejeita timestamp e header malformados', async () => {
  const secret = 'unit-test-webhook-secret'
  const validHash = 'a'.repeat(64)

  assert.equal(
    await verifyMercadoPagoWebhookSignature(
      secret,
      'abc123',
      'request',
      `ts=abc,v1=${validHash}`,
    ),
    false,
  )
  assert.equal(
    await verifyMercadoPagoWebhookSignature(
      secret,
      'abc123',
      'request',
      'ts=1700000000,v1=not-hex',
    ),
    false,
  )
})

test('comparação de assinatura é feita byte a byte', () => {
  assert.equal(constantTimeEqualHex('abcd', 'abcd'), true)
  assert.equal(constantTimeEqualHex('abcd', 'abce'), false)
  assert.equal(constantTimeEqualHex('abcd', 'abcde'), false)
})

test('notificação aprovada repetida permanece no estado pago', () => {
  const first = mapMercadoPagoPaymentState('approved')
  const second = mapMercadoPagoPaymentState('approved')

  assert.equal(first, 'paid')
  assert.equal(second, 'paid')
  assert.equal(first, second)
})

test('confirmação distingue pagamento efetivo, reserva expirada e cancelamento', () => {
  assert.equal(
    classifyPaymentConfirmation({ payment_status: 'paid' }),
    'paid',
  )
  assert.equal(
    classifyPaymentConfirmation({
      payment_status: 'cancelled',
      reservationExpired: true,
    }),
    'reservation_expired',
  )
  assert.equal(
    classifyPaymentConfirmation({ payment_status: 'cancelled' }),
    'order_cancelled',
  )
  assert.equal(
    classifyPaymentConfirmation({ payment_status: 'pending' }),
    'not_confirmed',
  )
  assert.equal(classifyPaymentConfirmation({}), 'not_confirmed')
  assert.equal(classifyPaymentConfirmation(null), 'not_confirmed')
})

test('erro da RPC nunca vira pagamento confirmado', () => {
  assert.deepEqual(
    decidePaymentConfirmation({ message: 'falha transitória' }, { payment_status: 'paid' }),
    { kind: 'error', message: 'falha transitória' },
  )
  assert.deepEqual(
    decidePaymentConfirmation(null, { payment_status: 'pending' }),
    { kind: 'reconciliation', reason: 'not_confirmed' },
  )
  assert.deepEqual(
    decidePaymentConfirmation(null, { payment_status: 'paid' }),
    { kind: 'paid' },
  )
})

test('a mesma confirmação repetida não altera a classificação', () => {
  const confirmation = { payment_status: 'paid' as const }
  assert.equal(classifyPaymentConfirmation(confirmation), 'paid')
  assert.equal(classifyPaymentConfirmation(confirmation), 'paid')
})

test('pagamento só confirma com BRL, pedido e valor corretos', () => {
  const payment = {
    external_reference: '42',
    currency_id: 'BRL',
    transaction_amount: 100,
  }

  assert.equal(paymentMatchesOrder(payment, 42, 10000), true)
  assert.equal(paymentMatchesOrder(payment, 42, 10000), true)
  assert.equal(
    paymentMatchesOrder({ ...payment, currency_id: 'USD' }, 42, 10000),
    false,
  )
  assert.equal(paymentMatchesOrder(payment, 42, 9999), false)
  assert.equal(paymentMatchesOrder(payment, 99, 10000), false)
})

test('webhook valida a assinatura oficial e rejeita assinatura inválida', async () => {
  const secret = 'unit-test-webhook-secret'
  const dataId = '987654321'
  const requestId = 'request-unit-test'
  const ts = '1700000000'
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const v1 = await signatureFor(secret, manifest)

  assert.equal(
    await verifyMercadoPagoWebhookSignature(
      secret,
      dataId,
      requestId,
      `ts=${ts},v1=${v1}`,
    ),
    true,
  )

  assert.equal(
    await verifyMercadoPagoWebhookSignature(
      secret,
      dataId,
      requestId,
      'ts=1700000000,v1=invalid',
    ),
    false,
  )
})
