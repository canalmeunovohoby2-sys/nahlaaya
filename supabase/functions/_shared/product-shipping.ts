import { HttpError } from './http.ts'

export const POSTGRES_INTEGER_MAX = 2_147_483_647

export interface ProductShippingInput {
  weightGrams?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
}

export function readOptionalPositiveInteger(
  value: unknown,
  label: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  let parsed: number

  if (typeof value === 'number') {
    parsed = value
  } else if (typeof value === 'string') {
    const normalized = value.trim()

    if (!/^[0-9]+$/.test(normalized)) {
      throw new HttpError(400, label + ' inválido.')
    }

    parsed = Number(normalized)
  } else {
    throw new HttpError(400, label + ' inválido.')
  }

  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > POSTGRES_INTEGER_MAX
  ) {
    throw new HttpError(400, label + ' inválido.')
  }

  return parsed
}

export function applyShippingFields<T extends Record<string, unknown>>(
  payload: T,
  shipping: ProductShippingInput,
): T {
  if (shipping.weightGrams !== undefined) {
    payload.weight_grams = shipping.weightGrams
  }

  if (shipping.lengthCm !== undefined) {
    payload.length_cm = shipping.lengthCm
  }

  if (shipping.widthCm !== undefined) {
    payload.width_cm = shipping.widthCm
  }

  if (shipping.heightCm !== undefined) {
    payload.height_cm = shipping.heightCm
  }

  return payload
}
