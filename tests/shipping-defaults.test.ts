import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ESTIMATED_PACKAGING_DEFAULTS,
  estimatedPackagingFormValues,
} from '../src/lib/shipping-defaults.ts'

test('padrão estimado usa os valores operacionais propostos', () => {
  assert.deepEqual(ESTIMATED_PACKAGING_DEFAULTS, {
    perfumeWeightGrams: 700,
    boxWeightGrams: 200,
    boxLengthCm: 35,
    boxWidthCm: 25,
    boxHeightCm: 15,
    maxPerfumesPerBox: 3,
  })
})

test('aplicação do padrão preenche somente os seis campos de embalagem', () => {
  assert.deepEqual(estimatedPackagingFormValues(), {
    perfumeWeightGrams: '700',
    boxWeightGrams: '200',
    boxLengthCm: '35',
    boxWidthCm: '25',
    boxHeightCm: '15',
    maxPerfumesPerBox: '3',
  })
})
