import type {
  ArtworksPage,
  ArtworksPageParam,
} from '@/queries/artworks/types'
import type { Artwork } from '@/types/products'

import { useMemo } from 'react'

import { useInfiniteQuery } from '@tanstack/react-query'

import { dedupeArtworks } from '@/lib/artworks/utils'
import { getNextArtworksPageParam } from '@/queries/artworks/queryOptions'
import { resolveCollectionHandlesForArtist } from '@/queries/artworks/utils'
import { fetchArtworksForCollectionHandles } from '@/queries/artworks/multiCollectionFetch'

import { ITEMS_PER_PAGE } from './useArtworksListing'

interface UseArtistArtworksListingArgs {
  artistName: string
  artistSlug: string
  selectedWorks: Artwork[] | undefined
}

export function useArtistArtworksListing({
  artistName,
  artistSlug,
  selectedWorks,
}: UseArtistArtworksListingArgs) {
  const handles = useMemo(
    () => resolveCollectionHandlesForArtist(artistName),
    [artistName],
  )

  const sanitizedSelectedWorks = useMemo<Artwork[]>(
    () => (Array.isArray(selectedWorks) ? selectedWorks.filter(Boolean) : []),
    [selectedWorks],
  )

  const infiniteQueryResult = useInfiniteQuery<
    ArtworksPage,
    Error,
    Artwork[],
    [string, string, string],
    ArtworksPageParam
  >({
    queryKey: ['artist-artworks', artistSlug, artistName],
    initialPageParam: {
      source: sanitizedSelectedWorks.length > 0 ? 'sanity' : 'shopify',
      collectionHandles: handles.length > 0 ? handles : undefined,
    } satisfies ArtworksPageParam,
    queryFn: async ({ pageParam }) => {
      if (pageParam.source === 'sanity') {
        const items = sanitizedSelectedWorks.slice(0, ITEMS_PER_PAGE)
        const page: ArtworksPage = {
          source: 'sanity',
          items,
          pageInfo: {
            hasNextPage: handles.length > 0,
            endCursor: undefined,
          },
        }
        return page
      }

      if (handles.length === 0) {
        const emptyShopifyPage: ArtworksPage = {
          source: 'shopify',
          items: [],
          pageInfo: { hasNextPage: false, endCursor: undefined },
          collectionHandles: [],
          cursorsByHandle: {},
          bufferedByHandle: undefined,
        }
        return emptyShopifyPage
      }

      const collectionHandles = pageParam.collectionHandles ?? handles

      return fetchArtworksForCollectionHandles(
        collectionHandles,
        {
          ...pageParam,
          collectionHandles,
        },
        ITEMS_PER_PAGE,
        'default',
        [],
      )
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.source === 'sanity') {
        if (handles.length === 0) return undefined
        return {
          source: 'shopify',
          collectionHandles: handles,
        }
      }

      const nextParam = getNextArtworksPageParam(lastPage)
      if (!nextParam) return undefined

      if (!nextParam.collectionHandles && handles.length > 0) {
        return { ...nextParam, collectionHandles: handles }
      }

      return nextParam
    },
    select: (data) => data.pages.flatMap((page) => page.items),
    gcTime: 7 * 60 * 1000,
    staleTime: 7 * 60 * 1000,
  })

  const {
    data: artworks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    isPending,
  } = infiniteQueryResult

  const dedupedArtworks = useMemo(() => dedupeArtworks(artworks ?? []), [artworks])

  return {
    artworks: dedupedArtworks,
    status,
    isPending,
    error,
    showLoadMoreButton: Boolean(hasNextPage),
    fetchNextPage,
    isFetchingNextPage,
  }
}
