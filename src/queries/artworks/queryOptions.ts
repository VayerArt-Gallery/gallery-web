import type { ArtworksPage, ArtworksPageParam } from './types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { QueryFunctionContext, QueryKey } from '@tanstack/react-query'

import { ITEMS_PER_PAGE } from '@/hooks/useArtworksListing'
import { normalizePriceRangeValues } from '@/lib/artworks/price'

import { fetchSanityPage, fetchShopifyPage } from './fetchers'

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

  return fetchShopifyPage(pageParam.after, pageSize, sortOption, filters)
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
  const hasFilters = Object.values(normalizedFilters).some(
    (values) => values.length > 0,
  )

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
      collectionHandles: undefined,
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
    staleTime: 2 * 60 * 1000,
    gcTime: 7 * 60 * 1000,
    maxPages: 20,
  }
}
