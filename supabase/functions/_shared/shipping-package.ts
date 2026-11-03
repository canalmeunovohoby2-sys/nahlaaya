import { POSTGRES_INTEGER_MAX } from './product-shipping.ts'

export interface GlobalPackaging {
  perfumeWeightGrams: number | null
  boxWeightGrams: number | null
  boxLengthCm: number | null
  boxWidthCm: number | null
  boxHeightCm: number | null
  maxPerfumesPerBox: number | null
}

export interface PackagingProduct {
  id: string
  quantity: number
  weightGrams?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
}

export interface ShippingPackage {
  kind: 'standard' | 'individual'
  items: { productId: string; quantity: number }[]
  weightGrams: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface PackageCalculation {
  configured: boolean
  packages: ShippingPackage[]
  error?: string
}

export interface ShippingCartValidation {
  valid: boolean
  error?: string
}

export function validateShippingCart(
  products: readonly PackagingProduct[],
): ShippingCartValidation {
  if (products.length === 0) {
    return {
      valid: false,
      error: 'Adicione pelo menos um produto ao carrinho para calcular o frete.',
    }
  }

  for (const product of products) {
    if (!Number.isSafeInteger(product.quantity) || product.quantity <= 0) {
      return {
        valid: false,
        error: 'Quantidade de produto inválida.',
      }
    }
  }

  return { valid: true }
}

function isPositiveInteger(value: number | null): value is number {
  return (
    Number.isSafeInteger(value) &&
    value !== null &&
    value > 0 &&
    value <= POSTGRES_INTEGER_MAX
  )
}

function hasCompleteIndividualPackaging(product: PackagingProduct): boolean {
  return (
    isPositiveInteger(product.weightGrams ?? null) &&
    isPositiveInteger(product.lengthCm ?? null) &&
    isPositiveInteger(product.widthCm ?? null) &&
    isPositiveInteger(product.heightCm ?? null)
  )
}

/**
 * Regra de embalagem:
 * - O padrão global agrupa até `maxPerfumesPerBox` unidades por caixa.
 * - Cada caixa recebe uma vez o peso da caixa externa.
 * - Um produto com os quatro campos individuais completos é tratado como uma
 *   embalagem individual por unidade, substituindo o padrão global.
 * - Produto com dados individuais parciais usa o padrão global.
 */
export function calculateShippingPackages(
  products: readonly PackagingProduct[],
  global: GlobalPackaging,
): PackageCalculation {
  const cart = validateShippingCart(products)

  if (!cart.valid) {
    return {
      configured: false,
      packages: [],
      error: cart.error,
    }
  }

  const packages: ShippingPackage[] = []
  const standardUnits: PackagingProduct[] = []

  for (const product of products) {
    if (hasCompleteIndividualPackaging(product)) {
      for (let unit = 0; unit < product.quantity; unit += 1) {
        packages.push({
          kind: 'individual',
          items: [{ productId: product.id, quantity: 1 }],
          weightGrams: product.weightGrams as number,
          lengthCm: product.lengthCm as number,
          widthCm: product.widthCm as number,
          heightCm: product.heightCm as number,
        })
      }
    } else {
      for (let unit = 0; unit < product.quantity; unit += 1) {
        standardUnits.push(product)
      }
    }
  }

  if (standardUnits.length === 0) {
    return { configured: true, packages }
  }

  const config = [
    global.perfumeWeightGrams,
    global.boxWeightGrams,
    global.boxLengthCm,
    global.boxWidthCm,
    global.boxHeightCm,
    global.maxPerfumesPerBox,
  ]

  if (!config.every(isPositiveInteger)) {
    return {
      configured: false,
      packages: [],
      error: 'Configure a embalagem padrão antes de calcular o frete.',
    }
  }

  const maxPerBox = global.maxPerfumesPerBox as number
  for (let index = 0; index < standardUnits.length; index += maxPerBox) {
    const boxProducts = standardUnits.slice(index, index + maxPerBox)
    const quantities = new Map<string, number>()

    for (const product of boxProducts) {
      quantities.set(product.id, (quantities.get(product.id) ?? 0) + 1)
    }

    packages.push({
      kind: 'standard',
      items: Array.from(quantities, ([productId, quantity]) => ({
        productId,
        quantity,
      })),
      weightGrams:
        (global.boxWeightGrams as number) +
        boxProducts.length * (global.perfumeWeightGrams as number),
      lengthCm: global.boxLengthCm as number,
      widthCm: global.boxWidthCm as number,
      heightCm: global.boxHeightCm as number,
    })
  }

  return { configured: true, packages }
}
