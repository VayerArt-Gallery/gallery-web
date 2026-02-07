import type { Artwork } from '@/types/products'

export type PriceRangeOption = {
  value: string
  label: string
  min: number
  max: number | null
}

export const PRICE_RANGE_OPTIONS: PriceRangeOption[] = [
  { value: 'under-500', label: 'Under $500', min: 0, max: 500 },
  { value: '500-1k', label: '$500 - $1,000', min: 500, max: 1000 },
  { value: '1k-2k', label: '$1,000 - $2,000', min: 1000, max: 2000 },
  { value: '2k-5k', label: '$2,000 - $5,000', min: 2000, max: 5000 },
  { value: '5k-10k', label: '$5,000 - $10,000', min: 5000, max: 10000 },
  { value: '10k-plus', label: 'Over $10,000', min: 10000, max: null },
]

const PRICE_RANGE_BY_VALUE = new Map(
  PRICE_RANGE_OPTIONS.map((option) => [option.value, option]),
)

export function normalizePriceRangeValues(values: string[]): string[] {
  const unique = new Set(values)
  return PRICE_RANGE_OPTIONS.map((option) => option.value).filter((value) =>
    unique.has(value),
  )
}

export function matchesSelectedPriceRanges(
  amount: string | number | null | undefined,
  selectedRanges: string[],
): boolean {
  if (selectedRanges.length === 0) return true
  if (amount == null) return false

  const numericAmount = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(numericAmount)) return false

  return selectedRanges.some((rangeValue) => {
    const range = PRICE_RANGE_BY_VALUE.get(rangeValue)
    if (!range) return false
    if (numericAmount < range.min) return false
    if (range.max === null) return true
    return numericAmount < range.max
  })
}

export function filterArtworksByPriceRanges(
  artworks: Artwork[],
  selectedRanges: string[],
): Artwork[] {
  if (selectedRanges.length === 0) return artworks
  return artworks.filter((artwork) =>
    matchesSelectedPriceRanges(artwork.price, selectedRanges),
  )
}
