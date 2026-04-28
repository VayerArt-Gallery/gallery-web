import type { ArtworksPage, ArtworksPageParam } from '@/queries/artworks/types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { QueryFunctionContext, QueryKey } from '@tanstack/react-query'

import { ITEMS_PER_PAGE } from '@/hooks/useArtworksListing'
import { normalizeSinglePriceRangeValue } from '@/lib/artworks/price'
import { fetchFilteredShopifyPage } from '@/queries/artworks/shopifySearch'

function normalizeFilterValues(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

function normalizeFilters(filters: ArtworksFilterState): ArtworksFilterState {
  const singlePriceRange = normalizeSinglePriceRangeValue(filters.priceRanges)

  return {
    styles: normalizeFilterValues(filters.styles),
    categories: normalizeFilterValues(filters.categories),
    themes: normalizeFilterValues(filters.themes),
    artists: normalizeFilterValues(filters.artists),
    orientations: normalizeFilterValues(filters.orientations),
    priceRanges: singlePriceRange ? [singlePriceRange] : [],
  }
}

function normalizeSearchTerm(searchTerm: string): string {
  return searchTerm.trim().replace(/\s+/g, ' ')
}

export function createSearchArtworksInfiniteQueryOptions({
  searchTerm,
  pageSize = ITEMS_PER_PAGE,
  filters,
  sortOption,
  availability = true,
}: {
  searchTerm: string
  pageSize?: number
  filters: ArtworksFilterState
  sortOption: ArtworksSortOption
  availability?: boolean
}) {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm)
  const normalizedFilters = normalizeFilters(filters)

  return {
    queryKey: [
      'search-artworks',
      normalizedSearchTerm,
      normalizedFilters,
      sortOption,
      availability,
    ],
    enabled: normalizedSearchTerm.length > 0,
    initialPageParam: {
      source: 'shopify',
      after: undefined,
    } satisfies ArtworksPageParam,
    queryFn: ({
      pageParam,
    }: QueryFunctionContext<QueryKey, ArtworksPageParam>) =>
      fetchFilteredShopifyPage(
        pageParam.after,
        pageSize,
        sortOption,
        normalizedFilters,
        availability,
        normalizedSearchTerm,
      ),
    getNextPageParam: (
      lastPage: ArtworksPage,
    ): ArtworksPageParam | undefined =>
      lastPage.pageInfo.hasNextPage
        ? {
            source: 'shopify',
            after: lastPage.pageInfo.endCursor ?? undefined,
          }
        : undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 7 * 60 * 1000,
    maxPages: 20,
  }
}
