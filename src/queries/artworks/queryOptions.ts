import type { ArtworksPage, ArtworksPageParam } from './types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { QueryFunctionContext, QueryKey } from '@tanstack/react-query'

import { ITEMS_PER_PAGE } from '@/hooks/useArtworksListing'
import { normalizePriceRangeValues } from '@/lib/artworks/price'

import { buildFilterCollectionHandles } from './collections'
import { fetchSanityPage, fetchShopifyPage } from './fetchers'
import { fetchArtworksForCollectionHandles } from './multiCollectionFetch'

function normalizeFilterValues(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

function normalizeFilters(filters: ArtworksFilterState): ArtworksFilterState {
  return {
    styles: normalizeFilterValues(filters.styles),
    categories: normalizeFilterValues(filters.categories),
    themes: normalizeFilterValues(filters.themes),
    artists: normalizeFilterValues(filters.artists),
    priceRanges: normalizePriceRangeValues(filters.priceRanges),
  }
}

export async function fetchArtworksPage(
  { pageParam }: QueryFunctionContext<QueryKey, ArtworksPageParam>,
  {
    pageSize = ITEMS_PER_PAGE,
    filters,
    sortOption,
  }: {
    pageSize?: number
    filters: ArtworksFilterState
    sortOption: ArtworksSortOption
  },
): Promise<ArtworksPage> {
  if (pageParam.source === 'sanity') {
    return fetchSanityPage(pageSize)
  }

  // Always rebuild collection handles from current filters to prevent stale data
  const collectionHandles = buildFilterCollectionHandles(filters)

  if (collectionHandles.length > 0) {
    return fetchArtworksForCollectionHandles(
      collectionHandles,
      pageParam,
      pageSize,
      sortOption,
      filters.priceRanges,
    )
  }

  return fetchShopifyPage(
    pageParam.after,
    pageSize,
    sortOption,
    filters.priceRanges,
  )
}

export function getNextArtworksPageParam(
  lastPage: ArtworksPage,
): ArtworksPageParam | undefined {
  if (lastPage.source === 'sanity') {
    // After the initial Sanity page, we move to Shopify paging
    return { source: 'shopify', after: undefined }
  }
  const handles = lastPage.collectionHandles
  if (handles && handles.length > 0) {
    const cursors = lastPage.cursorsByHandle ?? {}
    const buffers = lastPage.bufferedByHandle ?? {}
    const hasMore = handles.some((handle) => {
      if (handle in buffers) return true // buffer only exists if length > 0
      const cursor = cursors[handle]
      return cursor !== null && cursor !== undefined
    })

    return hasMore
      ? {
          source: 'shopify',
          collectionHandles: handles,
          cursorsByHandle: cursors,
          bufferedByHandle: buffers,
        }
      : undefined
  }

  return lastPage.pageInfo.hasNextPage
    ? {
        source: 'shopify',
        after: lastPage.pageInfo.endCursor ?? undefined,
      }
    : undefined
}

export function createAllArtworksInfiniteQueryOptions({
  pageSize = ITEMS_PER_PAGE,
  filters,
  sortOption,
}: {
  pageSize?: number
  filters: ArtworksFilterState
  sortOption: ArtworksSortOption
}) {
  const normalizedFilters = normalizeFilters(filters)
  const normalizedSort = sortOption
  const initialHandles = buildFilterCollectionHandles(normalizedFilters)
  const hasCollectionFilters = initialHandles.length > 0
  const hasPriceFilters = normalizedFilters.priceRanges.length > 0
  const hasFilters = hasCollectionFilters || hasPriceFilters

  // Use Sanity only when sort is 'default' and there are no filters
  const useSanity = normalizedSort === 'default' && !hasFilters
  const initialSource: ArtworksPageParam['source'] = useSanity
    ? 'sanity'
    : 'shopify'

  return {
    queryKey: ['all-artworks', normalizedFilters, normalizedSort],
    initialPageParam: {
      source: initialSource,
      after: undefined,
      collectionHandles: hasCollectionFilters ? initialHandles : undefined,
      cursorsByHandle: undefined,
      bufferedByHandle: undefined,
    } as ArtworksPageParam,
    queryFn: (ctx: QueryFunctionContext<QueryKey, ArtworksPageParam>) =>
      fetchArtworksPage(ctx, {
        pageSize,
        filters: normalizedFilters,
        sortOption: normalizedSort,
      }),
    getNextPageParam: getNextArtworksPageParam,
    gcTime: 7 * 60 * 1000,
    maxPages: 20,
  }
}
