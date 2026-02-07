import type { ArtworksPage } from './types'
import type {
  Public_GetAllProductsQuery,
} from '@/queries/graphql/generated/react-query'
import type { SearchSortKeys } from '@/queries/graphql/generated/types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { Artwork } from '@/types/products'

import { filterArtworksByFilters } from '@/lib/artworks/filtering'
import { formatProducts, productsToArtworks } from '@/lib/normalizers/products'
import { buildSearchProductFilters } from '@/queries/artworks/filterOptions'
import { fetcher } from '@/queries/graphql/fetcher'

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

export async function fetchFilteredShopifyPage(
  after: string | undefined,
  pageSize: number,
  sortOption: ArtworksSortOption,
  filters: ArtworksFilterState,
): Promise<ArtworksPage> {
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
