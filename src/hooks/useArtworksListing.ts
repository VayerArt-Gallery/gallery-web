import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
  ArtworksSortOption,
} from '@/types/filters'

import { useMemo } from 'react'

import { queryOptions, useInfiniteQuery } from '@tanstack/react-query'

import { dedupeArtworks } from '@/lib/artworks/utils'
import { fetchFilterOptions } from '@/queries/artworks/filterOptions'
import { createAllArtworksInfiniteQueryOptions } from '@/queries/artworks/queryOptions'

export const ITEMS_PER_PAGE = 32

export const artworkFilterOptionsQueryOptions = queryOptions({
  queryKey: ['artwork-filter-options'],
  queryFn: fetchFilterOptions,
  staleTime: 15 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  retry: 2,
})

interface UseArtworksListingArgs {
  sortOption: ArtworksSortOption
  filters: ArtworksFilterState
}

export function useArtworksListing({
  sortOption,
  filters,
}: UseArtworksListingArgs) {
  const infiniteQueryOptions = useMemo(
    () =>
      createAllArtworksInfiniteQueryOptions({
        pageSize: ITEMS_PER_PAGE,
        filters,
        sortOption,
      }),
    [filters, sortOption],
  )

  const {
    data: artworks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    ...infiniteQueryOptions,
    select: (data) => data.pages.flatMap((page) => page.items),
  })

  const loadedArtworks = artworks ?? []
  const dedupedArtworks = useMemo(
    () => dedupeArtworks(loadedArtworks),
    [loadedArtworks],
  )

  const fallbackOptions = useMemo<ArtworksFilterOptions>(
    () => ({ styles: [], categories: [], themes: [], artists: [] }),
    [],
  )

  const showLoadMoreButton = Boolean(hasNextPage)

  return {
    fallbackOptions,
    artworks: dedupedArtworks,
    status,
    showLoadMoreButton,
    fetchNextPage,
    isFetchingNextPage,
  }
}
