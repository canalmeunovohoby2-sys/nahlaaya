import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateShippingPackages,
  validateShippingCart,
  type GlobalPackaging,
} from '../supabase/functions/_shared/shipping-package.ts'

const globalConfig: GlobalPackaging = {
  perfumeWeightGrams: 500,
  boxWeightGrams: 200,
  boxLengthCm: 30,
  boxWidthCm: 20,
  boxHeightCm: 15,
  maxPerfumesPerBox: 2,
}

const emptyGlobalConfig: GlobalPackaging = {
  perfumeWeightGrams: null,
  boxWeightGrams: null,
  boxLengthCm: null,
  boxWidthCm: null,
  boxHeightCm: null,
  maxPerfumesPerBox: null,
}

const completeIndividual = {
  id: 'individual',
  quantity: 2,
  weightGrams: 250,
  lengthCm: 12,
  widthCm: 8,
  heightCm: 6,
}

test('um perfume usa uma caixa padrão e soma o peso externo', () => {
  const result = calculateShippingPackages(
    [{ id: 'asad', quantity: 1 }],
    globalConfig,
  )

  assert.equal(result.configured, true)
  assert.equal(result.packages.length, 1)
  assert.equal(result.packages[0].weightGrams, 700)
  assert.equal(result.packages[0].lengthCm, 30)
  assert.equal(result.packages[0].widthCm, 20)
  assert.equal(result.packages[0].heightCm, 15)
})

test('dois perfumes cabem na mesma caixa', () => {
  const result = calculateShippingPackages(
    [{ id: 'asad', quantity: 2 }],
    globalConfig,
  )

  assert.equal(result.packages.length, 1)
  assert.equal(result.packages[0].weightGrams, 1200)
  assert.deepEqual(result.packages[0].items, [{ productId: 'asad', quantity: 2 }])
})

test('quantidade acima do limite gera caixas adicionais', () => {
  const result = calculateShippingPackages(
    [{ id: 'asad', quantity: 5 }],
    globalConfig,
  )

  assert.equal(result.packages.length, 3)
  assert.deepEqual(
    result.packages.map((box) => box.weightGrams),
    [1200, 1200, 700],
  )
})

test('produto com embalagem individual completa substitui o padrão', () => {
  const result = calculateShippingPackages(
    [
      {
        id: 'excecao',
        quantity: 2,
        weightGrams: 250,
        lengthCm: 12,
        widthCm: 8,
        heightCm: 6,
      },
    ],
    globalConfig,
  )

  assert.equal(result.packages.length, 2)
  assert.equal(result.packages[0].kind, 'individual')
  assert.equal(result.packages[0].weightGrams, 250)
  assert.equal(result.packages[0].lengthCm, 12)
  assert.equal(result.packages[1].kind, 'individual')
})

test('dados individuais parciais não substituem a configuração global', () => {
  const result = calculateShippingPackages(
    [{ id: 'parcial', quantity: 1, weightGrams: 250 }],
    globalConfig,
  )

  assert.equal(result.packages.length, 1)
  assert.equal(result.packages[0].kind, 'standard')
  assert.equal(result.packages[0].weightGrams, 700)
})

test('configuração global incompleta não gera cálculo', () => {
  const result = calculateShippingPackages(
    [{ id: 'asad', quantity: 1 }],
    { ...globalConfig, boxWidthCm: null },
  )

  assert.equal(result.configured, false)
  assert.equal(result.packages.length, 0)
  assert.match(result.error ?? '', /Configure a embalagem padrão/)
})

test('configuração global não aceita valores negativos', () => {
  const result = calculateShippingPackages(
    [{ id: 'asad', quantity: 1 }],
    { ...globalConfig, perfumeWeightGrams: -1 },
  )

  assert.equal(result.configured, false)
})

test('somente produtos individuais completos dispensam a configuração global', () => {
  const result = calculateShippingPackages([completeIndividual], emptyGlobalConfig)

  assert.equal(result.configured, true)
  assert.equal(result.packages.length, 2)
  assert.ok(result.packages.every((item) => item.kind === 'individual'))
  assert.deepEqual(
    result.packages.map((item) => item.weightGrams),
    [250, 250],
  )
})

test('pedido misto separa volume individual e caixa padrão', () => {
  const result = calculateShippingPackages(
    [
      { id: 'global', quantity: 2 },
      { ...completeIndividual, id: 'individual', quantity: 1 },
    ],
    globalConfig,
  )

  assert.equal(result.configured, true)
  assert.equal(result.packages.length, 2)

  const individual = result.packages.find((item) => item.kind === 'individual')
  const standard = result.packages.find((item) => item.kind === 'standard')

  assert.deepEqual(individual?.items, [
    { productId: 'individual', quantity: 1 },
  ])
  assert.equal(individual?.weightGrams, 250)
  assert.deepEqual(standard?.items, [{ productId: 'global', quantity: 2 }])
  assert.equal(standard?.weightGrams, 1200)
})

test('carrinho vazio é bloqueado antes de qualquer configuração', () => {
  const validation = validateShippingCart([])
  assert.equal(validation.valid, false)
  assert.match(validation.error ?? '', /pelo menos um produto/)

  const result = calculateShippingPackages([], globalConfig)
  assert.equal(result.configured, false)
  assert.deepEqual(result.packages, [])
  assert.match(result.error ?? '', /pelo menos um produto/)
})

test('carrinho com quantidade inválida é bloqueado', () => {
  const validation = validateShippingCart([{ id: 'a', quantity: 0 }])
  assert.equal(validation.valid, false)
  assert.match(validation.error ?? '', /Quantidade de produto/)
})
