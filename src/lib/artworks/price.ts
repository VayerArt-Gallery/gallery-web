import type { Artwork } from '@/types/products'

export type PriceRangeOption = {
  value: string
  label: string
  min: number
  max: number | null
}

export type PriceBounds = {
  min?: number
  max?: number
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

export function getPriceBoundsForRange(value: string): PriceBounds | undefined {
  const option = PRICE_RANGE_BY_VALUE.get(value)
  if (!option) return undefined

  const bounds: PriceBounds = {}
  if (option.min > 0) bounds.min = option.min
  if (option.max != null) bounds.max = option.max
  return bounds
}

export function getCombinedContiguousPriceBounds(
  selectedRanges: string[],
): PriceBounds | null {
  const normalized = normalizePriceRangeValues(selectedRanges)
  if (normalized.length === 0) return null

  const indices = normalized
    .map((value) => PRICE_RANGE_OPTIONS.findIndex((option) => option.value === value))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)

  if (indices.length !== normalized.length) return null

  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] !== indices[i - 1] + 1) return null
  }

  const first = PRICE_RANGE_OPTIONS[indices[0]]
  const last = PRICE_RANGE_OPTIONS[indices[indices.length - 1]]

  const bounds: PriceBounds = {}
  if (first.min > 0) bounds.min = first.min
  if (last.max != null) bounds.max = last.max
  return bounds
}

export function buildShopifyPriceQueryClause(selectedRanges: string[]): string {
  const normalized = normalizePriceRangeValues(selectedRanges)
  if (normalized.length === 0) return ''

  const clauses = normalized
    .map((value) => PRICE_RANGE_BY_VALUE.get(value))
    .filter((option): option is PriceRangeOption => Boolean(option))
    .map((option) => {
      const parts: string[] = []
      if (option.min > 0) parts.push(`price:>=${option.min}`)
      if (option.max != null) parts.push(`price:<${option.max}`)
      if (parts.length === 0) return ''
      if (parts.length === 1) return parts[0]
      return `(${parts.join(' AND ')})`
    })
    .filter(Boolean)

  if (clauses.length === 0) return ''
  if (clauses.length === 1) return clauses[0]
  return `(${clauses.join(' OR ')})`
}
