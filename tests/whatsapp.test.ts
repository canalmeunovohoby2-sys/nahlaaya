import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildProductWhatsAppMessage,
  buildProductWhatsAppUrl,
  buildWhatsAppUrl,
  WHATSAPP_HEADER_MESSAGE,
} from '../src/lib/whatsapp.ts'

test('mensagem do cabeçalho usa o número e o texto definidos', () => {
  const url = buildWhatsAppUrl(WHATSAPP_HEADER_MESSAGE)

  assert.match(url, /^https:\/\/wa\.me\/5521990845544\?text=/)
  assert.equal(
    new URL(url).searchParams.get('text'),
    'Olá! Conheci a Nahla Aya pela loja virtual e gostaria de obter mais informações.',
  )
})

test('mensagem do produto usa apenas o nome real, sem links', () => {
  const name = 'RÊVE DE PARIS — 100 ml'
  const url = buildProductWhatsAppUrl(name)
  const message = new URL(url).searchParams.get('text') ?? ''

  assert.equal(message, buildProductWhatsAppMessage(name))
  assert.equal(
    message,
    'Olá! Estou interessado(a) no perfume RÊVE DE PARIS — 100 ml da Nahla Aya e gostaria de tirar algumas dúvidas. Poderiam me ajudar?',
  )
  assert.equal(message.includes('http'), false)
  assert.match(url, /R%C3%8AVE%20DE%20PARIS/)
})

test('novo produto arbitrário usa o nome dinâmico e não inclui URL', () => {
  const message = new URL(buildProductWhatsAppUrl('Perfume Novo')).searchParams.get(
    'text',
  )

  assert.match(message ?? '', /perfume Perfume Novo da Nahla Aya/)
  assert.equal((message ?? '').includes('http'), false)
  assert.equal((message ?? '').includes('/produto/'), false)
})
