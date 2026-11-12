import { HttpError } from './http.ts'
import type { ShippingPackage } from './shipping-package.ts'

export interface ShippingPackageSnapshotSource {
  originCep: string
  destinationCep: string
  generatedAt: string
  volumes: readonly MelhorEnvioVolume[]
  options: readonly ParsedShippingOption[]
  packages: readonly ShippingPackage[]
}

export interface OrderShippingPayload {
  provider: 'melhor_envio'
  serviceId: string
  serviceName: string
  originCep: string
  destinationCep: string
  priceCents: number
  estimatedDays: number
  snapshot: {
    provider: 'melhor_envio'
    originCep: string
    destinationCep: string
    generatedAt: string
    options: readonly ParsedShippingOption[]
    packages: readonly ShippingPackage[]
  }
  volumes: readonly MelhorEnvioVolume[]
}

export interface QuoteProduct {
  id: string
  priceCents: number
}

export interface MelhorEnvioVolume {
  width: number
  height: number
  length: number
  weight: number
  insurance: number
}

export interface ParsedShippingOption {
  id: string
  label: string
  company: string
  priceCents: number
  estimatedDays: number
  deliveryMin: number | null
  deliveryMax: number | null
}

// Os serviços são definidos exclusivamente pela resposta da API do Melhor Envio.
// Não há classificação própria de produto nem bloqueio local de transportadora.


function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function assertVolumeShape(
  volume: MelhorEnvioVolume,
  packageNumber: number,
): void {
  const prefix = `Volume ${packageNumber}`

  if (!Number.isFinite(volume.weight) || volume.weight <= 0) {
    throw new HttpError(422, `${prefix}: peso inválido.`)
  }

  for (const [label, value] of [
    ['largura', volume.width],
    ['altura', volume.height],
    ['comprimento', volume.length],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new HttpError(422, `${prefix}: ${label} inválida.`)
    }
  }

  if (!Number.isFinite(volume.insurance) || volume.insurance < 0) {
    throw new HttpError(422, `${prefix}: valor segurado inválido.`)
  }
}

export function buildMelhorEnvioVolumes(
  packages: readonly ShippingPackage[],
  products: ReadonlyMap<string, QuoteProduct>,
): MelhorEnvioVolume[] {
  if (packages.length === 0) {
    throw new HttpError(422, 'Nenhum volume para cotar o frete.')
  }

  return packages.map((packageItem, index) => {
    let insuranceCents = 0

    for (const item of packageItem.items) {
      const product = products.get(item.productId)

      if (!product) {
        throw new HttpError(422, 'Produto do pedido não encontrado para a cotação.')
      }

      if (!Number.isSafeInteger(product.priceCents) || product.priceCents < 0) {
        throw new HttpError(422, 'Preço inválido para a cotação do frete.')
      }

      insuranceCents += product.priceCents * item.quantity
    }

    const volume: MelhorEnvioVolume = {
      width: packageItem.widthCm,
      height: packageItem.heightCm,
      length: packageItem.lengthCm,
      weight: Number((packageItem.weightGrams / 1000).toFixed(3)),
      insurance: roundMoney(insuranceCents / 100),
    }

    assertVolumeShape(volume, index + 1)
    return volume
  })
}

export function normalizePostalCode(
  value: unknown,
  label = 'destino',
): string {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : ''

  if (digits.length !== 8 || digits === '00000000') {
    throw new HttpError(400, `Informe um CEP de ${label} válido.`)
  }

  return digits
}

export function buildQuoteRequest(
  originCep: string,
  destinationCep: string,
  volumes: readonly MelhorEnvioVolume[],
): Record<string, unknown> {
  return {
    from: { postal_code: normalizePostalCode(originCep, 'origem') },
    to: { postal_code: normalizePostalCode(destinationCep) },
    volumes,
    options: { receipt: false, own_hand: false },
  }
}

function normalizeText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
    : ''
}

function readMoneyCents(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return Math.round(parsed * 100)
}

function readInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export function parseQuoteOptions(payload: unknown): ParsedShippingOption[] {
  if (!Array.isArray(payload)) {
    throw new HttpError(502, 'Resposta inválida do Melhor Envio.')
  }

  const options: ParsedShippingOption[] = []

  for (const item of payload) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const value = item as Record<string, unknown>
    const company = value.company
    const companyName =
      company && typeof company === 'object'
        ? normalizeText((company as Record<string, unknown>).name)
        : ''
    const serviceName =
      typeof value.name === 'string' ? value.name.trim() : ''

    if (!serviceName || !companyName) {
      continue
    }

    const priceCents = readMoneyCents(value.custom_price ?? value.price)
    const estimatedDays =
      readInteger(value.custom_delivery_time ?? value.delivery_time)
    const deliveryRange = value.custom_delivery_range ?? value.delivery_range
    const range =
      deliveryRange && typeof deliveryRange === 'object'
        ? (deliveryRange as Record<string, unknown>)
        : {}
    const deliveryMin = readInteger(range.min)
    const deliveryMax = readInteger(range.max)

    if (!Number.isSafeInteger(value.id) && typeof value.id !== 'string') {
      continue
    }

    if (priceCents === null || estimatedDays === null) {
      continue
    }

    options.push({
      id: String(value.id),
      label: serviceName,
      company: typeof (company as Record<string, unknown>).name === 'string'
        ? String((company as Record<string, unknown>).name).trim()
        : companyName,
      priceCents,
      estimatedDays,
      deliveryMin,
      deliveryMax,
    })
  }

  if (options.length === 0) {
    throw new HttpError(
      422,
      'Nenhum serviço de frete está disponível para este CEP na conta do Melhor Envio.',
    )
  }

  return options
}

export function selectQuoteOption(
  options: readonly ParsedShippingOption[],
  serviceId: string,
): ParsedShippingOption {
  const option = options.find((candidate) => candidate.id === serviceId)

  if (!option) {
    throw new HttpError(
      409,
      'A opção de frete selecionada não está mais disponível. Recalcule o frete.',
    )
  }

  return option
}

export function buildOrderShippingPayload(
  source: ShippingPackageSnapshotSource,
  selected: ParsedShippingOption,
): OrderShippingPayload {
  return {
    provider: 'melhor_envio',
    serviceId: selected.id,
    serviceName: selected.label,
    originCep: source.originCep,
    destinationCep: source.destinationCep,
    priceCents: selected.priceCents,
    estimatedDays: selected.estimatedDays,
    snapshot: {
      provider: 'melhor_envio',
      originCep: source.originCep,
      destinationCep: source.destinationCep,
      generatedAt: source.generatedAt,
      options: source.options,
      packages: source.packages,
    },
    volumes: source.volumes,
  }
}

export async function requestMelhorEnvioQuote(
  accessToken: string,
  userAgent: string,
  originCep: string,
  destinationCep: string,
  volumes: readonly MelhorEnvioVolume[],
  apiOrigin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ParsedShippingOption[]> {
  if (!accessToken.trim()) {
    throw new HttpError(
      409,
      'Conta do Melhor Envio não conectada. Conecte a conta no painel administrativo.',
    )
  }

  if (!userAgent.trim()) {
    throw new HttpError(503, 'Configuração ausente: MELHOR_ENVIO_USER_AGENT.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetchImpl(
      `${apiOrigin.replace(/\/+$/, '')}/api/v2/me/shipment/calculate`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': userAgent,
        },
        body: JSON.stringify(
          buildQuoteRequest(originCep, destinationCep, volumes),
        ),
        signal: controller.signal,
      },
    )

    if (!response.ok) {
      throw new HttpError(
        502,
        'Não foi possível calcular o frete no Melhor Envio. Tente novamente.',
      )
    }

    const payload = (await response.json().catch(() => null)) as unknown
    return parseQuoteOptions(payload)
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    throw new HttpError(
      502,
      'Não foi possível calcular o frete no Melhor Envio. Tente novamente.',
    )
  } finally {
    clearTimeout(timeout)
  }
}
