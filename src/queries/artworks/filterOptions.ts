import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
} from '@/types/filters'

import {
  getCombinedContiguousPriceBounds,
  getPriceBoundsForRange,
  normalizePriceRangeValues,
} from '@/lib/artworks/price'
import { fetcher } from '@/queries/graphql/fetcher'

type FilterKey = keyof ArtworksFilterOptions

type SearchFilterInput =
  | {
      available?: boolean
      price?: { min?: number; max?: number }
      productMetafield?: { namespace: string; key: string; value: string }
      taxonomyMetafield?: { namespace: string; key: string; value: string }
    }
  | Record<string, unknown>

type SearchFiltersResponse = {
  search: {
    productFilters: Array<{
      id: string
      label: string
      values: Array<{
        label: string
        input: string
      }>
    }>
  }
}

const SEARCH_FILTER_OPTIONS_QUERY = `
  query ArtworksSearchFilterOptions {
    search(query: "*", first: 1, types: [PRODUCT]) {
      productFilters {
        id
        label
        values {
          label
          input
        }
      }
    }
  }
`

const EMPTY_FILTER_OPTIONS: ArtworksFilterOptions = {
  styles: [],
  categories: [],
  themes: [],
  artists: [],
}

type FilterInputIndex = Record<FilterKey, Map<string, SearchFilterInput>>
type FilterLabelIndex = Record<FilterKey, Map<string, string>>

function createFilterInputIndex(): FilterInputIndex {
  return {
    styles: new Map(),
    categories: new Map(),
    themes: new Map(),
    artists: new Map(),
  }
}

function createFilterLabelIndex(): FilterLabelIndex {
  return {
    styles: new Map(),
    categories: new Map(),
    themes: new Map(),
    artists: new Map(),
  }
}

let cachedOptions: ArtworksFilterOptions | null = null
let cachedInputIndex: FilterInputIndex = createFilterInputIndex()
let cachedLabelIndex: FilterLabelIndex = createFilterLabelIndex()
let inFlight: Promise<ArtworksFilterOptions> | null = null

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

function detectFilterKey(
  filterId: string,
  input: SearchFilterInput,
): FilterKey | undefined {
  const pm = (input as any).productMetafield
  const tm = (input as any).taxonomyMetafield

  if (pm?.namespace === 'custom' && pm?.key === 'artist') return 'artists'
  if (pm?.namespace === 'custom' && pm?.key === 'category') return 'categories'

  if (tm?.namespace === 'shopify' && tm?.key === 'art-movement') return 'styles'
  if (tm?.namespace === 'shopify' && tm?.key === 'theme') return 'themes'

  if (pm?.key === 'artMovement') return 'styles'
  if (pm?.key === 'theme') return 'themes'

  if (filterId.includes('.custom.artist')) return 'artists'
  if (filterId.includes('.custom.category')) return 'categories'
  if (filterId.includes('art-movement')) return 'styles'
  if (filterId.endsWith('.theme')) return 'themes'

  return undefined
}

function fallbackFilterInput(
  key: FilterKey,
  value: string,
): SearchFilterInput | undefined {
  if (key === 'artists') {
    return {
      productMetafield: { namespace: 'custom', key: 'artist', value },
    }
  }
  if (key === 'categories') {
    return {
      productMetafield: { namespace: 'custom', key: 'category', value },
    }
  }
  return undefined
}

function parseFilterInput(raw: string): SearchFilterInput | undefined {
  try {
    return JSON.parse(raw) as SearchFilterInput
  } catch {
    return undefined
  }
}

async function loadSearchFilterOptions(): Promise<ArtworksFilterOptions> {
  const res = await fetcher<SearchFiltersResponse, undefined>(
    SEARCH_FILTER_OPTIONS_QUERY,
  )()

  const nextIndex = createFilterInputIndex()
  const nextLabels = createFilterLabelIndex()

  res.search.productFilters.forEach((filter) => {
    filter.values.forEach((value) => {
      const parsed = parseFilterInput(value.input)
      if (!parsed) return
      const key = detectFilterKey(filter.id, parsed)
      if (!key) return
      const normalized = normalizeLabel(value.label)
      if (!normalized) return
      if (!nextIndex[key].has(normalized)) {
        nextIndex[key].set(normalized, parsed)
        nextLabels[key].set(normalized, value.label)
      }
    })
  })

  cachedInputIndex = nextIndex
  cachedLabelIndex = nextLabels

  const nextOptions: ArtworksFilterOptions = {
    styles: Array.from(nextLabels.styles.values()).sort((a, b) =>
      a.localeCompare(b),
    ),
    categories: Array.from(nextLabels.categories.values()).sort((a, b) =>
      a.localeCompare(b),
    ),
    themes: Array.from(nextLabels.themes.values()).sort((a, b) =>
      a.localeCompare(b),
    ),
    artists: Array.from(nextLabels.artists.values()).sort((a, b) =>
      a.localeCompare(b),
    ),
  }

  cachedOptions = nextOptions
  return nextOptions
}

export async function fetchFilterOptions(): Promise<ArtworksFilterOptions> {
  if (cachedOptions) return cachedOptions
  if (inFlight) return inFlight
  inFlight = loadSearchFilterOptions()
  try {
    return await inFlight
  } catch {
    return EMPTY_FILTER_OPTIONS
  } finally {
    inFlight = null
  }
}

type BuildFilterResult = {
  productFilters: SearchFilterInput[]
  searchQuery: string
  requiresClientFallback: boolean
}

function addUniqueFilter(
  target: SearchFilterInput[],
  next: SearchFilterInput | undefined,
) {
  if (!next) return
  const serialized = JSON.stringify(next)
  const exists = target.some((item) => JSON.stringify(item) === serialized)
  if (!exists) target.push(next)
}

export async function buildSearchProductFilters(
  filters: ArtworksFilterState,
): Promise<BuildFilterResult> {
  await fetchFilterOptions()

  const productFilters: SearchFilterInput[] = [{ available: true }]
  let requiresClientFallback = false

  const keyedValues: Array<[FilterKey, string[]]> = [
    ['artists', filters.artists],
    ['categories', filters.categories],
    ['styles', filters.styles],
    ['themes', filters.themes],
  ]

  keyedValues.forEach(([key, values]) => {
    values.forEach((selectedValue) => {
      const normalized = normalizeLabel(selectedValue)
      const mapped = cachedInputIndex[key].get(normalized)
      if (mapped) {
        addUniqueFilter(productFilters, mapped)
        return
      }

      const fallback = fallbackFilterInput(key, selectedValue)
      if (fallback) {
        addUniqueFilter(productFilters, fallback)
        return
      }

      requiresClientFallback = true
    })
  })

  const normalizedPriceRanges = normalizePriceRangeValues(filters.priceRanges)
  let searchQuery = '*'

  if (normalizedPriceRanges.length === 1) {
    const bounds = getPriceBoundsForRange(normalizedPriceRanges[0])
    if (bounds) {
      addUniqueFilter(productFilters, { price: bounds })
    }
  } else if (normalizedPriceRanges.length > 1) {
    const combinedBounds = getCombinedContiguousPriceBounds(
      normalizedPriceRanges,
    )
    if (combinedBounds) {
      addUniqueFilter(productFilters, { price: combinedBounds })
    } else {
      // Disjoint ranges require OR semantics; keep client-side predicate for correctness.
      requiresClientFallback = true
      searchQuery = '*'
    }
  }

  return { productFilters, searchQuery, requiresClientFallback }
}
