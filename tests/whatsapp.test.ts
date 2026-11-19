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

test('mensagem do produto usa nome e link reais e codifica acentos', () => {
  const url = buildProductWhatsAppUrl(
    'RÊVE DE PARIS — 100 ml',
    'reve-de-paris-100-ml',
    'https://nahlaaya.vercel.app',
  )
  const message = new URL(url).searchParams.get('text') ?? ''

  assert.equal(
    message,
    buildProductWhatsAppMessage(
      'RÊVE DE PARIS — 100 ml',
      'https://nahlaaya.vercel.app/produto/reve-de-paris-100-ml',
    ),
  )
  assert.match(message, /RÊVE DE PARIS — 100 ml/)
  assert.match(message, /https:\/\/nahlaaya\.vercel\.app\/produto\/reve-de-paris-100-ml/)
  assert.match(url, /R%C3%8AVE%20DE%20PARIS/)
})

test('novo produto arbitrário recebe link dinâmico', () => {
  const url = buildProductWhatsAppUrl(
    'Perfume Novo',
    'perfume-novo',
    'https://nahlaaya.vercel.app/',
  )
  const message = new URL(url).searchParams.get('text') ?? ''

  assert.match(message, /perfume Perfume Novo da Nahla Aya/)
  assert.match(message, /Link do produto: https:\/\/nahlaaya\.vercel\.app\/produto\/perfume-novo/)
  assert.equal(new URL(url).searchParams.get('text'), message)
})
