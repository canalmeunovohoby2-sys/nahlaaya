import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyCheckoutForm } from '../src/lib/checkout.ts'
import {
  CHECKOUT_STORAGE_KEY,
  clearSavedCheckout,
  hasCheckoutData,
  readSavedCheckout,
  writeSavedCheckout,
} from '../src/lib/checkout-storage.ts'
import type { CheckoutStorage } from '../src/lib/checkout-storage.ts'

function createStorage(initial: Record<string, string> = {}): CheckoutStorage {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function customer(overrides = {}) {
  return {
    ...emptyCheckoutForm,
    fullName: 'Cliente Teste',
    cpf: '529.982.247-25',
    email: 'cliente@example.com',
    phone: '(11) 99999-8888',
    cep: '01001-000',
    street: 'Praça da Sé',
    number: '100',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    ...overrides,
  }
}

test('salva e restaura os dados de entrega do comprador', () => {
  const storage = createStorage()
  const values = customer()
  writeSavedCheckout(values, storage)
  const restored = readSavedCheckout(storage)

  assert.equal(restored?.fullName, values.fullName)
  assert.equal(restored?.cpf, values.cpf)
  assert.equal(restored?.street, values.street)
  assert.equal(restored?.state, values.state)
})

test('não salva dados de pagamento', () => {
  const storage = createStorage()
  writeSavedCheckout(customer(), storage)
  const raw = storage.getItem(CHECKOUT_STORAGE_KEY) ?? ''
  assert.equal(raw.includes('paymentMethod'), false)
  assert.equal(raw.includes('card'), false)
  assert.equal(raw.includes('cvv'), false)
})

test('permite alterar os dados restaurados', () => {
  const storage = createStorage()
  writeSavedCheckout(customer(), storage)
  writeSavedCheckout(customer({ city: 'Campinas' }), storage)
  assert.equal(readSavedCheckout(storage)?.city, 'Campinas')
})

test('limpa os dados salvos', () => {
  const storage = createStorage()
  writeSavedCheckout(customer(), storage)
  clearSavedCheckout(storage)
  assert.equal(readSavedCheckout(storage), null)
  assert.equal(storage.getItem(CHECKOUT_STORAGE_KEY), null)
})

test('descarta JSON malformado e dados vazios', () => {
  const malformed = createStorage({ [CHECKOUT_STORAGE_KEY]: '{invalido' })
  assert.equal(readSavedCheckout(malformed), null)

  const empty = createStorage()
  writeSavedCheckout(emptyCheckoutForm, empty)
  assert.equal(hasCheckoutData(emptyCheckoutForm), false)
  assert.equal(readSavedCheckout(empty), null)
})
