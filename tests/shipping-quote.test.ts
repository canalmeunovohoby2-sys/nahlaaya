import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMelhorEnvioVolumes,
  buildOrderShippingPayload,
  buildQuoteRequest,
  normalizePostalCode,
  parseQuoteOptions,
  requestMelhorEnvioQuote,
  selectQuoteOption,
} from '../supabase/functions/_shared/shipping-quote.ts'
import {
  calculateShippingPackages,
  type GlobalPackaging,
  type PackagingProduct,
  type ShippingPackage,
} from '../supabase/functions/_shared/shipping-package.ts'
import { normalizeCheckoutPayload } from '../supabase/functions/_shared/validation.ts'

const globalConfig: GlobalPackaging = {
  perfumeWeightGrams: 500,
  boxWeightGrams: 200,
  boxLengthCm: 30,
  boxWidthCm: 20,
  boxHeightCm: 15,
  maxPerfumesPerBox: 2,
}

const individualProduct: PackagingProduct = {
  id: 'individual',
  quantity: 1,
  weightGrams: 250,
  lengthCm: 20,
  widthCm: 12,
  heightCm: 8,
}

const prices = new Map([
  ['a', { id: 'a', priceCents: 19990 }],
  ['b', { id: 'b', priceCents: 15990 }],
  ['individual', { id: 'individual', priceCents: 25990 }],
])

const quotePayload = [
  {
    id: 1,
    name: 'PAC',
    custom_price: '25.90',
    custom_delivery_time: 8,
    custom_delivery_range: { min: 7, max: 8 },
    company: { name: 'Correios' },
  },
  {
    id: 2,
    name: 'SEDEX',
    price: '39.90',
    delivery_time: 3,
    delivery_range: { min: 2, max: 3 },
    company: { name: 'Correios' },
  },
]

function fetchResult(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function packagesFor(products: PackagingProduct[]): ShippingPackage[] {
  const result = calculateShippingPackages(products, globalConfig)
  assert.equal(result.configured, true)
  return result.packages
}

test('um perfume usa caixa padrão com peso da caixa uma vez', () => {
  const volumes = buildMelhorEnvioVolumes(
    packagesFor([{ id: 'a', quantity: 1 }]),
    prices,
  )

  assert.deepEqual(volumes, [
    {
      width: 20,
      height: 15,
      length: 30,
      weight: 0.7,
      insurance: 199.9,
    },
  ])
})

test('dois perfumes respeitam o limite de uma caixa', () => {
  const volumes = buildMelhorEnvioVolumes(
    packagesFor([{ id: 'a', quantity: 2 }]),
    prices,
  )

  assert.equal(volumes.length, 1)
  assert.equal(volumes[0].weight, 1.2)
  assert.equal(volumes[0].insurance, 399.8)
})

test('quantidade acima do limite gera duas caixas e dois pesos de caixa', () => {
  const volumes = buildMelhorEnvioVolumes(
    packagesFor([{ id: 'a', quantity: 3 }]),
    prices,
  )

  assert.equal(volumes.length, 2)
  assert.deepEqual(
    volumes.map((volume) => volume.weight),
    [1.2, 0.7],
  )
  assert.deepEqual(
    volumes.map((volume) => volume.insurance),
    [399.8, 199.9],
  )
})

test('produto individual completo gera volume próprio sem caixa global', () => {
  const volumes = buildMelhorEnvioVolumes(
    packagesFor([individualProduct]),
    prices,
  )

  assert.deepEqual(volumes, [
    {
      width: 12,
      height: 8,
      length: 20,
      weight: 0.25,
      insurance: 259.9,
    },
  ])
})

test('pedido misto mantém seguro por volume baseado nos itens', () => {
  const packages = packagesFor([
    { id: 'a', quantity: 2 },
    { ...individualProduct, id: 'b', quantity: 1 },
  ])
  const volumes = buildMelhorEnvioVolumes(
    packages,
    new Map([
      ...prices,
      ['b', { id: 'b', priceCents: 15990 }],
    ]),
  )

  assert.equal(volumes.length, 2)
  assert.deepEqual(
    volumes.map((volume) => volume.insurance),
    [159.9, 399.8],
  )
  assert.deepEqual(
    volumes.map((volume) => volume.weight),
    [0.25, 1.2],
  )
})

test('carrinho vazio continua bloqueado antes da cotação', () => {
  const result = calculateShippingPackages([], globalConfig)

  assert.equal(result.configured, false)
  assert.match(result.error ?? '', /pelo menos um produto/)
})

test('CEP inválido é rejeitado', () => {
  assert.throws(() => normalizePostalCode('123'))
  assert.throws(() => normalizePostalCode('00000000'))
  assert.equal(normalizePostalCode('01310-100'), '01310100')
})

test('payload usa volumes com height e length oficiais', () => {
  const payload = buildQuoteRequest('01310100', '20040020', [
    {
      width: 20,
      height: 15,
      length: 30,
      weight: 0.7,
      insurance: 199.9,
    },
  ])

  assert.deepEqual(payload, {
    from: { postal_code: '01310100' },
    to: { postal_code: '20040020' },
    volumes: [
      {
        width: 20,
        height: 15,
        length: 30,
        weight: 0.7,
        insurance: 199.9,
      },
    ],
    options: { receipt: false, own_hand: false },
  })
  assert.equal('products' in payload, false)
})

test('resposta disponibiliza PAC e SEDEX retornados pela API', () => {
  const options = parseQuoteOptions(quotePayload)

  assert.deepEqual(options, [
    {
      id: '1',
      label: 'PAC',
      company: 'Correios',
      priceCents: 2590,
      estimatedDays: 8,
      deliveryMin: 7,
      deliveryMax: 8,
    },
    {
      id: '2',
      label: 'SEDEX',
      company: 'Correios',
      priceCents: 3990,
      estimatedDays: 3,
      deliveryMin: 2,
      deliveryMax: 3,
    },
  ])
})

test('serviços indisponíveis retornam erro claro', () => {
  assert.throws(() => parseQuoteOptions([]))
})

test('seleção usa o identificador e rejeita opção ausente', () => {
  const options = parseQuoteOptions(quotePayload)

  assert.equal(selectQuoteOption(options, '1').label, 'PAC')
  assert.equal(selectQuoteOption(options, '2').label, 'SEDEX')
  assert.throws(() => selectQuoteOption(options, '999'))
})

test('payload do pedido usa somente dados autoritativos da cotação', () => {
  const options = parseQuoteOptions(quotePayload)
  const packages = packagesFor([{ id: 'a', quantity: 1 }])
  const volumes = buildMelhorEnvioVolumes(packages, prices)
  const payload = buildOrderShippingPayload(
    {
      originCep: '01310100',
      destinationCep: '20040020',
      generatedAt: '2026-11-04T00:00:00.000Z',
      options,
      packages,
      volumes,
    },
    options[1],
  )

  assert.equal(payload.provider, 'melhor_envio')
  assert.equal(payload.serviceId, '2')
  assert.equal(payload.serviceName, 'SEDEX')
  assert.equal(payload.originCep, '01310100')
  assert.equal(payload.destinationCep, '20040020')
  assert.equal(payload.priceCents, 3990)
  assert.equal(payload.estimatedDays, 3)
  assert.deepEqual(payload.volumes, volumes)
  assert.equal(payload.snapshot.generatedAt, '2026-11-04T00:00:00.000Z')
  assert.equal(payload.snapshot.options.length, 2)
})

test('requisição envia volumes e usa custom_price/custom_delivery_time', async () => {
  let requestBody: Record<string, unknown> | null = null
  const fakeFetch = async (_url: string, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return fetchResult(quotePayload)
  }

  const options = await requestMelhorEnvioQuote(
    'token',
    'Nahla Aya (suporte@example.com)',
    '01310100',
    '20040020',
    [
      {
        width: 20,
        height: 15,
        length: 30,
        weight: 0.7,
        insurance: 199.9,
      },
    ],
    'https://sandbox.melhorenvio.com.br',
    fakeFetch,
  )

  assert.equal(options.length, 2)
  assert.equal(requestBody?.from instanceof Object, true)
  assert.equal(Array.isArray(requestBody?.volumes), true)
  assert.equal('products' in (requestBody ?? {}), false)
})

test('conta desconectada e falha externa retornam erros claros', async () => {
  await assert.rejects(
    () =>
      requestMelhorEnvioQuote(
        '',
        'Nahla Aya (suporte@example.com)',
        '01310100',
        '20040020',
        [],
        'https://sandbox.melhorenvio.com.br',
      ),
    /Conta do Melhor Envio não conectada/,
  )

  await assert.rejects(
    () =>
      requestMelhorEnvioQuote(
        'token',
        'Nahla Aya (suporte@example.com)',
        '01310100',
        '20040020',
        [
          {
            width: 20,
            height: 15,
            length: 30,
            weight: 0.7,
            insurance: 199.9,
          },
        ],
        'https://sandbox.melhorenvio.com.br',
        async () => fetchResult({ message: 'falha' }, 500),
      ),
    /Não foi possível calcular o frete/,
  )
})

test('o preço do frete enviado pelo navegador é descartado', () => {
  const normalized = normalizeCheckoutPayload({
    buyer: {
      fullName: 'Cliente de Teste',
      cpf: '52998224725',
      email: 'cliente@example.com',
      phone: '21999999999',
    },
    address: {
      cep: '01310100',
      street: 'Rua de Teste',
      number: '10',
      complement: '',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
    },
    paymentMethod: 'pix',
    items: [{ productId: 'a', quantity: 1 }],
    shippingServiceId: '2',
    shipping: {
      priceCents: 1,
      serviceName: 'Frete manipulado',
      estimatedDays: 99,
    },
  })

  assert.equal(normalized.shippingServiceId, '2')
  assert.equal('shipping' in normalized, false)
})

test('volumes com peso ou dimensão inválidos são rejeitados', () => {
  const invalid: ShippingPackage[] = [
    {
      kind: 'standard',
      items: [{ productId: 'a', quantity: 1 }],
      weightGrams: 500,
      lengthCm: 30,
      widthCm: 0,
      heightCm: 15,
    },
  ]

  assert.throws(() => buildMelhorEnvioVolumes(invalid, prices), /largura/)
})
