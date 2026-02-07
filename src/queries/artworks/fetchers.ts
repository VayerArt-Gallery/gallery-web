import type {
  ArtworksPage,
  CollectionSummary,
  Public_GetCollectionsQuery,
  Public_GetCollectionsQueryVariables,
} from './types'
import type {
  Public_GetAllProductsQuery,
  Public_GetAllProductsQueryVariables,
  Public_GetCollectionProductsQuery,
  Public_GetCollectionProductsQueryVariables,
} from '@/queries/graphql/generated/react-query'
import type {
  ProductCollectionSortKeys,
  ProductSortKeys,
  SearchSortKeys,
} from '@/queries/graphql/generated/types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { Artwork } from '@/types/products'

import { filterArtworksByFilters } from '@/lib/artworks/filtering'
import { formatProducts, productsToArtworks } from '@/lib/normalizers/products'
import { SHOPIFY_AVAILABLE_IN_STOCK_QUERY } from '@/queries/constants'
import { buildSearchProductFilters } from '@/queries/artworks/filterOptions'
import { fetcher } from '@/queries/graphql/fetcher'
import {
  Public_GetAllProductsDocument,
  Public_GetCollectionProductsDocument,
  Public_GetCollectionsDocument,
} from '@/queries/graphql/generated/react-query'
import { getAllArtworks } from '@/queries/sanity/products'

import { detectFilterKey, formatCollectionTitleFromHandle } from './utils'

type SearchProductFilterInput =
  | {
      available?: boolean
      price?: { min?: number; max?: number }
      productMetafield?: { namespace: string; key: string; value: string }
      taxonomyMetafield?: { namespace: string; key: string; value: string }
    }
  | Record<string, unknown>

type SearchProductsVariables = {
  first: number
  after?: string
  query: string
  sortKey: SearchSortKeys
  reverse: boolean
  productFilters: SearchProductFilterInput[]
  imagesFirst: number
}

type SearchProductsResponse = {
  search: {
    pageInfo: {
      hasNextPage: boolean
      endCursor?: string | null
    }
    nodes: Array<{
      __typename: string
      id?: string
      title?: string
      handle?: string
      createdAt?: string
      descriptionHtml?: string
      priceRange?: {
        maxVariantPrice: {
          amount: string
          currencyCode: any
        }
      }
      images?: {
        edges: Array<{
          node: {
            id?: string | null
            url: string
            altText?: string | null
            width?: number | null
            height?: number | null
          }
        }>
      }
      artist?: { value?: string | null } | null
      category?: { value?: string | null } | null
      dimensionsImperial?: { value?: string | null } | null
      dimensionsMetric?: { value?: string | null } | null
      medium?: { value?: string | null } | null
      style?: {
        references?: {
          nodes: Array<{
            __typename: string
            id?: string
            handle?: string
            label?: { value?: string | null } | null
          }>
        } | null
      } | null
      theme?: {
        references?: {
          nodes: Array<{
            __typename: string
            id?: string
            handle?: string
            label?: { value?: string | null } | null
          }>
        } | null
      } | null
    }>
  }
}

const SEARCH_PRODUCTS_QUERY = `
  query ArtworksSearchProducts(
    $first: Int!
    $after: String
    $query: String!
    $sortKey: SearchSortKeys!
    $reverse: Boolean!
    $productFilters: [ProductFilter!]
    $imagesFirst: Int!
  ) {
    search(
      first: $first
      after: $after
      query: $query
      types: [PRODUCT]
      unavailableProducts: HIDE
      sortKey: $sortKey
      reverse: $reverse
      productFilters: $productFilters
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        __typename
        ... on Product {
          id
          title
          handle
          createdAt
          descriptionHtml
          images(first: $imagesFirst) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          priceRange {
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          artist: metafield(namespace: "custom", key: "artist") {
            value
            type
          }
          category: metafield(namespace: "custom", key: "category") {
            value
            type
          }
          dimensionsImperial: metafield(namespace: "custom", key: "dimensions_us") {
            value
            type
          }
          dimensionsMetric: metafield(namespace: "custom", key: "dimensions_global") {
            value
            type
          }
          medium: metafield(namespace: "custom", key: "medium") {
            value
            type
          }
          style: metafield(namespace: "shopify", key: "art-movement") {
            references(first: 4) {
              nodes {
                __typename
                ...LabeledMetaobject
              }
            }
          }
          theme: metafield(namespace: "shopify", key: "theme") {
            references(first: 4) {
              nodes {
                __typename
                ...LabeledMetaobject
              }
            }
          }
        }
      }
    }
  }
  fragment LabeledMetaobject on Metaobject {
    id
    handle
    label: field(key: "label") {
      value
    }
  }
`

function getShopifySortParams(sortOption: ArtworksSortOption): {
  sortKey: ProductSortKeys
  reverse: boolean
} {
  switch (sortOption) {
    case 'default':
      return { sortKey: 'TITLE' as ProductSortKeys, reverse: false }
    case 'title-asc':
      return { sortKey: 'TITLE' as ProductSortKeys, reverse: false }
    case 'title-desc':
      return { sortKey: 'TITLE' as ProductSortKeys, reverse: true }
    case 'price-asc':
      return { sortKey: 'PRICE' as ProductSortKeys, reverse: false }
    case 'price-desc':
      return { sortKey: 'PRICE' as ProductSortKeys, reverse: true }
  }
}

function getShopifyCollectionSortParams(sortOption: ArtworksSortOption): {
  sortKey: ProductCollectionSortKeys
  reverse: boolean
} {
  switch (sortOption) {
    case 'default':
      return { sortKey: 'TITLE' as ProductCollectionSortKeys, reverse: false }
    case 'title-asc':
      return { sortKey: 'TITLE' as ProductCollectionSortKeys, reverse: false }
    case 'title-desc':
      return { sortKey: 'TITLE' as ProductCollectionSortKeys, reverse: true }
    case 'price-asc':
      return { sortKey: 'PRICE' as ProductCollectionSortKeys, reverse: false }
    case 'price-desc':
      return { sortKey: 'PRICE' as ProductCollectionSortKeys, reverse: true }
  }
}

function getShopifySearchSortParams(sortOption: ArtworksSortOption): {
  sortKey: SearchSortKeys
  reverse: boolean
} {
  switch (sortOption) {
    case 'price-asc':
      return { sortKey: 'PRICE' as SearchSortKeys, reverse: false }
    case 'price-desc':
      return { sortKey: 'PRICE' as SearchSortKeys, reverse: true }
    case 'default':
    case 'title-asc':
    case 'title-desc':
      return { sortKey: 'RELEVANCE' as SearchSortKeys, reverse: false }
  }
}

function toProductConnection(
  nodes: SearchProductsResponse['search']['nodes'],
): NonNullable<Public_GetAllProductsQuery['products']> {
  const edges = nodes
    .filter((node) => node.__typename === 'Product')
    .filter(
      (node): node is SearchProductsResponse['search']['nodes'][number] & {
        __typename: 'Product'
        id: string
        title: string
        handle: string
        createdAt: string
        descriptionHtml: string
        images: NonNullable<SearchProductsResponse['search']['nodes'][number]['images']>
        priceRange: NonNullable<SearchProductsResponse['search']['nodes'][number]['priceRange']>
      } =>
        Boolean(
          node.id &&
            node.title &&
            node.handle &&
            node.createdAt &&
            node.descriptionHtml &&
            node.images &&
            node.priceRange,
        ),
    )
    .map((node) => ({
      cursor: node.id,
      node: {
        id: node.id,
        title: node.title,
        handle: node.handle,
        createdAt: node.createdAt,
        descriptionHtml: node.descriptionHtml,
        images: node.images,
        priceRange: node.priceRange,
        artist: node.artist ?? null,
        category: node.category ?? null,
        dimensionsImperial: node.dimensionsImperial ?? null,
        dimensionsMetric: node.dimensionsMetric ?? null,
        medium: node.medium ?? null,
        style: node.style ?? null,
        theme: node.theme ?? null,
      },
    }))

  return {
    __typename: 'ProductConnection',
    edges: edges as NonNullable<Public_GetAllProductsQuery['products']>['edges'],
    pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: null },
  }
}

export async function fetchShopifyPage(
  after: string | undefined,
  pageSize: number,
  sortOption: ArtworksSortOption,
  filters: ArtworksFilterState,
): Promise<ArtworksPage> {
  const hasActiveFilters = Object.values(filters).some(
    (values) => values.length > 0,
  )

  if (!hasActiveFilters) {
    const { sortKey, reverse } = getShopifySortParams(sortOption)

    const variables: Public_GetAllProductsQueryVariables = {
      first: pageSize,
      after,
      sortKey,
      reverse,
      imagesFirst: 1,
      query: SHOPIFY_AVAILABLE_IN_STOCK_QUERY,
    }

    const res = await fetcher<
      Public_GetAllProductsQuery,
      Public_GetAllProductsQueryVariables
    >(Public_GetAllProductsDocument, variables)()

    const normalized = formatProducts(res.products) ?? []
    const items = productsToArtworks(normalized)
    const pageInfo = res.products.pageInfo

    return { source: 'shopify', items, pageInfo }
  }

  const { sortKey, reverse } = getShopifySearchSortParams(sortOption)
  const { productFilters, searchQuery, requiresClientFallback } =
    await buildSearchProductFilters(filters)

  const requiresClientScan = requiresClientFallback

  let currentCursor = after
  let hasNextPage = true
  let endCursor: string | undefined = after
  let attempts = 0
  const isPriceSort =
    sortOption === 'price-asc' || sortOption === 'price-desc'
  const maxBatches = requiresClientScan
    ? isPriceSort
      ? 40
      : 12
    : 1
  const batchSize = requiresClientScan ? Math.max(pageSize * 4, 128) : pageSize
  const collected: Artwork[] = []

  while (hasNextPage && collected.length < pageSize && attempts < maxBatches) {
    attempts += 1

    const variables: SearchProductsVariables = {
      first: batchSize,
      after: currentCursor,
      sortKey,
      reverse,
      imagesFirst: 1,
      query: searchQuery,
      productFilters,
    }

    const res = await fetcher<
      SearchProductsResponse,
      SearchProductsVariables
    >(SEARCH_PRODUCTS_QUERY, variables)()

    const connection = toProductConnection(res.search.nodes)
    const normalized = formatProducts(connection) ?? []
    const batchItems = productsToArtworks(normalized)
    const filteredBatch = requiresClientFallback
      ? filterArtworksByFilters(batchItems, filters)
      : batchItems
    const remainingSlots = pageSize - collected.length

    collected.push(...filteredBatch.slice(0, remainingSlots))

    hasNextPage = res.search.pageInfo.hasNextPage
    currentCursor = res.search.pageInfo.endCursor ?? undefined
    endCursor = currentCursor
  }

  return {
    source: 'shopify',
    items: collected,
    pageInfo: { hasNextPage, endCursor },
  }
}

export async function fetchCollectionProductsPage(
  handle: string,
  after: string | undefined,
  pageSize: number,
  sortOption: ArtworksSortOption,
): Promise<ArtworksPage> {
  const { sortKey, reverse } = getShopifyCollectionSortParams(sortOption)

  const variables: Public_GetCollectionProductsQueryVariables = {
    collectionHandle: handle,
    productsFirst: pageSize,
    productsAfter: after,
    productsSortKey: sortKey,
    productsReverse: reverse,
    imagesFirst: 1,
  }

  const res = await fetcher<
    Public_GetCollectionProductsQuery,
    Public_GetCollectionProductsQueryVariables
  >(Public_GetCollectionProductsDocument, variables)().catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to load collection products', handle, error)
    }
    throw error
  })

  const connection = res.collectionByHandle?.products
  if (!connection) {
    return {
      source: 'shopify',
      items: [],
      pageInfo: { hasNextPage: false, endCursor: undefined },
    }
  }

  const normalized =
    formatProducts(
      connection as unknown as NonNullable<
        Public_GetAllProductsQuery['products']
      >,
    ) ?? []
  const items = productsToArtworks(normalized)
  const pageInfo = connection.pageInfo

  return {
    source: 'shopify',
    items,
    pageInfo: {
      hasNextPage: pageInfo.hasNextPage,
      endCursor: pageInfo.endCursor,
    },
  }
}

export async function fetchCollectionsPage(
  after: string | undefined,
  pageSize: number,
): Promise<{
  items: CollectionSummary[]
  pageInfo: { hasNextPage: boolean; endCursor?: string }
}> {
  const variables: Public_GetCollectionsQueryVariables = {
    first: pageSize,
    after: after ?? null,
  }

  const res = await fetcher<
    Public_GetCollectionsQuery,
    Public_GetCollectionsQueryVariables
  >(Public_GetCollectionsDocument, variables)()

  const connection = res.collections
  if (!connection) {
    return {
      items: [],
      pageInfo: { hasNextPage: false, endCursor: undefined },
    }
  }

  const items = connection.edges
    .map((edge) => edge.node)
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .map((node) => {
      const handle = (node.handle ?? '').trim()
      const rawTitle = (node.title ?? '').trim()
      const key = detectFilterKey(handle)
      const fallback = key ? formatCollectionTitleFromHandle(handle, key) : ''
      return {
        handle,
        title: rawTitle || fallback,
      }
    })
    .filter(
      (node): node is CollectionSummary =>
        node.handle !== '' && node.title !== '',
    )

  const { hasNextPage, endCursor } = connection.pageInfo

  return {
    items,
    pageInfo: {
      hasNextPage,
      endCursor: endCursor ?? undefined,
    },
  }
}

export function extractSanityArtworks(input: unknown): Artwork[] {
  if (Array.isArray(input)) return input as Artwork[]
  if (
    typeof input === 'object' &&
    input !== null &&
    Array.isArray((input as any).selectedArtworks)
  ) {
    return (input as any).selectedArtworks as Artwork[]
  }
  return []
}

export async function fetchSanityPage(pageSize: number): Promise<ArtworksPage> {
  const raw = await getAllArtworks()
  const items = extractSanityArtworks(raw).slice(0, pageSize)
  // Intentionally mark hasNextPage true so the next page switches to Shopify
  return {
    source: 'sanity',
    items,
    pageInfo: { hasNextPage: true, endCursor: undefined },
  }
}
