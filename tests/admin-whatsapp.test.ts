import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminWhatsAppContact,
  buildAdminWhatsAppMessage,
  normalizeBrazilianWhatsAppNumber,
} from '../src/admin/whatsapp.ts'
import { isValidPhone } from '../src/lib/checkout-validation.ts'

test('normaliza telefone brasileiro com DDD e código do país', () => {
  assert.equal(
    normalizeBrazilianWhatsAppNumber('(21) 99084-5544'),
    '5521990845544',
  )
  assert.equal(
    normalizeBrazilianWhatsAppNumber('5521990845544'),
    '5521990845544',
  )
  assert.equal(normalizeBrazilianWhatsAppNumber('(21) 3333-4444'), '552133334444')
  assert.equal(normalizeBrazilianWhatsAppNumber('(00) 99999-9999'), null)
  assert.equal(normalizeBrazilianWhatsAppNumber('123'), null)
})

test('mensagem e link usam o nome real do cliente', () => {
  const contact = buildAdminWhatsAppContact(
    'Maria da Silva',
    '(21) 99084-5544',
  )

  assert.ok(contact)
  assert.equal(contact.number, '5521990845544')
  assert.equal(contact.display, '(21) 99084-5544')
  assert.equal(
    new URL(contact.url).searchParams.get('text'),
    buildAdminWhatsAppMessage('Maria da Silva'),
  )
  assert.match(contact.url, /Maria%20da%20Silva/)
  assert.equal(contact.url.includes('https://wa.me/5521990845544?text='), true)
})

test('telefone ausente ou inválido não gera link incorreto', () => {
  assert.equal(buildAdminWhatsAppContact('Cliente', ''), null)
  assert.equal(buildAdminWhatsAppContact('Cliente', '999'), null)
  assert.equal(buildAdminWhatsAppContact('Cliente', '(00) 99999-9999'), null)
  assert.equal(buildAdminWhatsAppContact('', '(21) 99084-5544'), null)
})

test('checkout aceita WhatsApp brasileiro com DDD e rejeita inválidos', () => {
  assert.equal(isValidPhone('(21) 99084-5544'), true)
  assert.equal(isValidPhone('(21) 3333-4444'), true)
  assert.equal(isValidPhone('12345'), false)
  assert.equal(isValidPhone('(00) 99999-9999'), false)
})
