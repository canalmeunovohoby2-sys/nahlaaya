import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyShippingFields,
  POSTGRES_INTEGER_MAX,
  readOptionalPositiveInteger,
} from '../supabase/functions/_shared/product-shipping.ts'

const existing = {
  id: 'perfume-existente',
  name: 'Perfume Existente',
  brand: 'Marca',
  volume_ml: 100,
  concentration: 'EDP',
  price: 35000,
  stock: 4,
  active: true,
  weight_grams: 500,
  length_cm: 20,
  width_cm: 15,
  height_cm: 10,
}

function mergeUpdate(payload: Record<string, unknown>) {
  return { ...existing, ...payload }
}

test('editar somente o preço preserva peso e dimensões', () => {
  const payload = applyShippingFields(
    { installment_total_cents: 40000, pix_price_cents: 36000 },
    {},
  )
  const merged = mergeUpdate(payload)

  assert.equal(merged.price, existing.price)
  assert.equal(merged.weight_grams, 500)
  assert.equal(merged.length_cm, 20)
  assert.equal(merged.width_cm, 15)
  assert.equal(merged.height_cm, 10)
})

test('editar somente o estoque preserva peso e dimensões', () => {
  const merged = mergeUpdate({ stock: 9 })

  assert.equal(merged.stock, 9)
  assert.equal(merged.weight_grams, 500)
  assert.equal(merged.length_cm, 20)
  assert.equal(merged.width_cm, 15)
  assert.equal(merged.height_cm, 10)
})

test('atualizar explicitamente um campo de frete altera somente ele', () => {
  const merged = mergeUpdate(
    applyShippingFields({ stock: 2 }, { weightGrams: 750 }),
  )

  assert.equal(merged.weight_grams, 750)
  assert.equal(merged.length_cm, 20)
  assert.equal(merged.width_cm, 15)
  assert.equal(merged.height_cm, 10)
})

test('enviar null explicitamente limpa o campo de frete', () => {
  const merged = mergeUpdate(
    applyShippingFields({ stock: 2 }, { weightGrams: null }),
  )

  assert.equal(merged.weight_grams, null)
  assert.equal(merged.length_cm, 20)
  assert.equal(merged.width_cm, 15)
  assert.equal(merged.height_cm, 10)
})

test('criar produto sem dados de frete não inclui campos de envio', () => {
  const payload = applyShippingFields(
    {
      id: 'novo',
      name: 'Novo Perfume',
      brand: 'Marca',
      volume_ml: 100,
      concentration: 'EDP',
    },
    {},
  )

  assert.equal('weight_grams' in payload, false)
  assert.equal('length_cm' in payload, false)
  assert.equal('width_cm' in payload, false)
  assert.equal('height_cm' in payload, false)
})

test('diferencia campo ausente de null e valida valores positivos', () => {
  assert.equal(readOptionalPositiveInteger(undefined, 'Peso'), undefined)
  assert.equal(readOptionalPositiveInteger(null, 'Peso'), null)
  assert.equal(readOptionalPositiveInteger('', 'Peso'), null)
  assert.equal(readOptionalPositiveInteger('500', 'Peso'), 500)
  assert.throws(() => readOptionalPositiveInteger(0, 'Peso'))
  assert.throws(() => readOptionalPositiveInteger(-1, 'Peso'))
  assert.throws(() => readOptionalPositiveInteger(1.5, 'Peso'))
})

test('rejeita booleanos, arrays, objetos e decimais', () => {
  for (const value of [
    true,
    false,
    [500],
    ['500'],
    { value: 500 },
    1.5,
    '1.5',
    '1,5',
    '1e3',
    '0x10',
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.throws(() => readOptionalPositiveInteger(value, 'Peso'))
  }
})

test('limita o valor ao intervalo de integer do PostgreSQL', () => {
  assert.equal(
    readOptionalPositiveInteger(POSTGRES_INTEGER_MAX, 'Peso'),
    POSTGRES_INTEGER_MAX,
  )
  assert.equal(
    readOptionalPositiveInteger(String(POSTGRES_INTEGER_MAX), 'Peso'),
    POSTGRES_INTEGER_MAX,
  )
  assert.throws(() =>
    readOptionalPositiveInteger(POSTGRES_INTEGER_MAX + 1, 'Peso'),
  )
  assert.throws(() =>
    readOptionalPositiveInteger(String(POSTGRES_INTEGER_MAX + 1), 'Peso'),
  )
  assert.throws(() =>
    readOptionalPositiveInteger(Number.MAX_SAFE_INTEGER, 'Peso'),
  )
})
