import { HttpError } from './http.ts'
import {
  getValidMelhorEnvioAccessToken,
} from './melhor-envio-connection.ts'
import { melhorEnvioApiOrigin } from './melhor-envio.ts'
import {
  calculateShippingPackages,
  type GlobalPackaging,
  type PackagingProduct,
  type ShippingPackage,
} from './shipping-package.ts'
import {
  buildMelhorEnvioVolumes,
  normalizePostalCode,
  requestMelhorEnvioQuote,
  type MelhorEnvioVolume,
  type ParsedShippingOption,
  type QuoteProduct,
} from './shipping-quote.ts'

export interface ShippingQuoteItem {
  productId: string
  quantity: number
}

export interface ServerShippingQuote {
  originCep: string
  destinationCep: string
  packages: ShippingPackage[]
  volumes: MelhorEnvioVolume[]
  options: ParsedShippingOption[]
  generatedAt: string
}

type ServiceClient = ReturnType<
  typeof import('./supabase.ts').getServiceClient
>

const MAX_QUOTE_ITEMS = 50

function normalizeItems(
  items: readonly ShippingQuoteItem[],
): Map<string, number> {
  if (items.length === 0) {
    throw new HttpError(
      422,
      'Adicione pelo menos um produto ao carrinho para calcular o frete.',
    )
  }

  const quantities = new Map<string, number>()

  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== 'string' ||
      item.productId.length === 0 ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new HttpError(422, 'Itens inválidos para a cotação do frete.')
    }

    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    )
  }

  if (quantities.size > MAX_QUOTE_ITEMS) {
    throw new HttpError(422, 'Itens demais para calcular o frete.')
  }

  return quantities
}

function packagingSettings(settings: Record<string, unknown>): GlobalPackaging {
  return {
    perfumeWeightGrams:
      typeof settings.perfume_weight_grams === 'number'
        ? settings.perfume_weight_grams
        : null,
    boxWeightGrams:
      typeof settings.box_weight_grams === 'number'
        ? settings.box_weight_grams
        : null,
    boxLengthCm:
      typeof settings.box_length_cm === 'number'
        ? settings.box_length_cm
        : null,
    boxWidthCm:
      typeof settings.box_width_cm === 'number'
        ? settings.box_width_cm
        : null,
    boxHeightCm:
      typeof settings.box_height_cm === 'number'
        ? settings.box_height_cm
        : null,
    maxPerfumesPerBox:
      typeof settings.max_perfumes_per_box === 'number'
        ? settings.max_perfumes_per_box
        : null,
  }
}

export async function calculateServerShippingQuote(
  client: ServiceClient,
  items: readonly ShippingQuoteItem[],
  destinationCep: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ServerShippingQuote> {
  const destination = normalizePostalCode(destinationCep)
  const quantities = normalizeItems(items)
  const { data: settings, error: settingsError } = await client
    .from('shipping_settings')
    .select(
      'origin_cep,perfume_weight_grams,box_weight_grams,box_length_cm,box_width_cm,box_height_cm,max_perfumes_per_box',
    )
    .eq('id', true)
    .maybeSingle()

  if (settingsError) {
    throw new HttpError(503, 'Não foi possível consultar a configuração de envio.')
  }

  if (!settings || typeof settings.origin_cep !== 'string') {
    throw new HttpError(
      422,
      'O CEP de origem da loja ainda não foi configurado.',
    )
  }

  const origin = normalizePostalCode(settings.origin_cep, 'origem')
  const productIds = [...quantities.keys()]
  const { data: rows, error: productsError } = await client
    .from('products')
    .select(
      'id,name,active,stock,installment_total_cents,weight_grams,length_cm,width_cm,height_cm',
    )
    .in('id', productIds)

  if (productsError) {
    throw new HttpError(503, 'Não foi possível consultar os produtos do carrinho.')
  }

  const products = new Map(
    (rows ?? []).map((row) => [String(row.id), row]),
  )

  const packagingProducts: PackagingProduct[] = []
  const quoteProducts = new Map<string, QuoteProduct>()

  for (const [productId, quantity] of quantities) {
    const product = products.get(productId)

    if (!product || product.active !== true) {
      throw new HttpError(422, 'Um dos produtos do carrinho está indisponível.')
    }

    if (
      !Number.isSafeInteger(product.stock) ||
      product.stock < quantity
    ) {
      throw new HttpError(
        422,
        `Estoque insuficiente para ${String(product.name ?? 'um produto')}.`,
      )
    }

    if (
      !Number.isSafeInteger(product.installment_total_cents) ||
      product.installment_total_cents <= 0
    ) {
      throw new HttpError(422, 'Preço inválido para a cotação do frete.')
    }

    packagingProducts.push({
      id: productId,
      quantity,
      weightGrams:
        typeof product.weight_grams === 'number' ? product.weight_grams : null,
      lengthCm:
        typeof product.length_cm === 'number' ? product.length_cm : null,
      widthCm:
        typeof product.width_cm === 'number' ? product.width_cm : null,
      heightCm:
        typeof product.height_cm === 'number' ? product.height_cm : null,
    })

    quoteProducts.set(productId, {
      id: productId,
      priceCents: product.installment_total_cents,
    })
  }

  const computation = calculateShippingPackages(
    packagingProducts,
    packagingSettings(settings as Record<string, unknown>),
  )

  if (!computation.configured) {
    throw new HttpError(
      422,
      computation.error ?? 'Configure a embalagem padrão antes de calcular o frete.',
    )
  }

  const volumes = buildMelhorEnvioVolumes(computation.packages, quoteProducts)
  const accessToken = await getValidMelhorEnvioAccessToken(client)

  if (!accessToken) {
    throw new HttpError(
      409,
      'Conta do Melhor Envio não conectada. Conecte a conta no painel administrativo.',
    )
  }

  const userAgent = Deno.env.get('MELHOR_ENVIO_USER_AGENT')?.trim() ?? ''
  const options = await requestMelhorEnvioQuote(
    accessToken,
    userAgent,
    origin,
    destination,
    volumes,
    melhorEnvioApiOrigin(),
    fetchImpl,
  )

  return {
    originCep: origin,
    destinationCep: destination,
    packages: computation.packages,
    volumes,
    options,
    generatedAt: new Date().toISOString(),
  }
}
