import type { Artwork } from '@/types/products'

export type ArtworksPageParam = {
  source: 'sanity' | 'shopify'
  after?: string
  collectionHandles?: string[]
  cursorsByHandle?: Record<string, string | null | undefined>
  bufferedByHandle?: Record<string, Artwork[]>
  deliveredGids?: string[]
}

export type ArtworksPage = {
  source: 'sanity' | 'shopify'
  items: Artwork[]
  pageInfo: { hasNextPage: boolean; endCursor?: string | null }
  collectionHandles?: string[]
  cursorsByHandle?: Record<string, string | null | undefined>
  bufferedByHandle?: Record<string, Artwork[]>
  deliveredGids?: string[]
}

export type CollectionSummary = {
  handle: string
  title: string
}

export type Public_GetCollectionsQuery = {
  collections?: {
    pageInfo: {
      hasNextPage: boolean
      endCursor?: string | null
    }
    edges: Array<{
      node?: {
        handle?: string | null
        title?: string | null
      } | null
    }>
  } | null
}

export type Public_GetCollectionsQueryVariables = {
  first: number
  after?: string | null
}
