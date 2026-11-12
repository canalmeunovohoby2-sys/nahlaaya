export const ESTIMATED_PACKAGING_DEFAULTS = {
  perfumeWeightGrams: 700,
  boxWeightGrams: 200,
  boxLengthCm: 35,
  boxWidthCm: 25,
  boxHeightCm: 15,
  maxPerfumesPerBox: 3,
} as const

export function estimatedPackagingFormValues(): Record<
  keyof typeof ESTIMATED_PACKAGING_DEFAULTS,
  string
> {
  return {
    perfumeWeightGrams: String(ESTIMATED_PACKAGING_DEFAULTS.perfumeWeightGrams),
    boxWeightGrams: String(ESTIMATED_PACKAGING_DEFAULTS.boxWeightGrams),
    boxLengthCm: String(ESTIMATED_PACKAGING_DEFAULTS.boxLengthCm),
    boxWidthCm: String(ESTIMATED_PACKAGING_DEFAULTS.boxWidthCm),
    boxHeightCm: String(ESTIMATED_PACKAGING_DEFAULTS.boxHeightCm),
    maxPerfumesPerBox: String(ESTIMATED_PACKAGING_DEFAULTS.maxPerfumesPerBox),
  }
}
