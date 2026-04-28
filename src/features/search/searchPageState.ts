import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'

import { normalizeSinglePriceRangeValue } from '@/lib/artworks/price'

export const SEARCH_QUERY_MAX_LENGTH = 70
const SEARCH_TITLE_MAX_LENGTH = 25

export type SearchPageRouteState = {
  q?: string
  sort?: ArtworksSortOption
  styles: string[]
  categories: string[]
  themes: string[]
  artists: string[]
  orientations: string[]
  priceRanges: string[]
}

export const EMPTY_SEARCH_FILTERS: ArtworksFilterState = {
  styles: [],
  categories: [],
  themes: [],
  artists: [],
  orientations: [],
  priceRanges: [],
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

function isSortOption(value: string | undefined): value is ArtworksSortOption {
  return (
    value === 'default' ||
    value === 'title-asc' ||
    value === 'title-desc' ||
    value === 'price-asc' ||
    value === 'price-desc'
  )
}

export function normalizeSearchQuery(searchTerm?: string): string {
  if (!searchTerm) return ''
  return searchTerm.trim().slice(0, SEARCH_QUERY_MAX_LENGTH)
}

export function createSearchPageState(
  searchTerm?: string,
): SearchPageRouteState {
  const normalizedQuery = normalizeSearchQuery(searchTerm)

  return {
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    ...EMPTY_SEARCH_FILTERS,
  }
}

export function normalizeSearchPageState(
  state: Partial<SearchPageRouteState>,
): SearchPageRouteState {
  const q = typeof state.q === 'string' ? normalizeSearchQuery(state.q) : ''
  const sort = isSortOption(state.sort) ? state.sort : undefined

  return {
    q: q || undefined,
    sort,
    styles: toStringArray(state.styles),
    categories: toStringArray(state.categories),
    themes: toStringArray(state.themes),
    artists: toStringArray(state.artists),
    orientations: toStringArray(state.orientations),
    priceRanges: (() => {
      const single = normalizeSinglePriceRangeValue(
        toStringArray(state.priceRanges),
      )
      return single ? [single] : []
    })(),
  }
}

export function toSearchPageFilters(
  state: SearchPageRouteState,
): ArtworksFilterState {
  return {
    styles: state.styles,
    categories: state.categories,
    themes: state.themes,
    artists: state.artists,
    orientations: state.orientations,
    priceRanges: state.priceRanges,
  }
}

export function getSearchDisplayQuery(query: string): string {
  const normalizedQuery = normalizeSearchQuery(query)
  if (normalizedQuery.length <= SEARCH_TITLE_MAX_LENGTH) {
    return normalizedQuery
  }

  return `${normalizedQuery.slice(0, SEARCH_TITLE_MAX_LENGTH)}...`
}
