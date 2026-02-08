import type { ArtworksPage } from './types'
import type { SearchSortKeys } from '@/queries/graphql/generated/types'
import type { ArtworksFilterState, ArtworksSortOption } from '@/types/filters'
import type { Artwork } from '@/types/products'

import { filterArtworksByFilters } from '@/lib/artworks/filtering'
import { slugify } from '@/lib/utils'
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
      priceRange?: {
        maxVariantPrice: {
          amount: string
          currencyCode: any
        }
      }
      images?: {
        edges: Array<{
          node: {
            url: string
          }
        }>
      }
      artist?: { value?: string | null } | null
      category?: { value?: string | null } | null
      orientation?: { value?: string | null } | null
      dimensionsImperial?: { value?: string | null } | null
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
      unavailableProducts: SHOW
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
          images(first: $imagesFirst) {
            edges {
              node {
                url
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
          orientation: metafield(namespace: "custom", key: "orientation") {
            value
            type
          }
          dimensionsImperial: metafield(namespace: "custom", key: "dimensions_us") {
            value
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

function normalizeMetaLabel(value: string): string {
  const label = value.trim()
  if (!label) return ''
  return label
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function extractTagLabels(
  field: SearchProductsResponse['search']['nodes'][number]['style'] | SearchProductsResponse['search']['nodes'][number]['theme'],
): string[] {
  const nodes = field?.references?.nodes ?? []
  const labels = nodes
    .filter((node) => node.__typename === 'Metaobject')
    .map((node) => {
      const raw = node.label?.value ?? node.handle ?? ''
      return normalizeMetaLabel(raw)
    })
    .filter(Boolean)

  return Array.from(new Set(labels))
}

function toArtworkBatch(
  nodes: SearchProductsResponse['search']['nodes'],
  availability: boolean,
): Artwork[] {
  return nodes
    .filter((node) => node.__typename === 'Product')
    .filter(
      (node): node is SearchProductsResponse['search']['nodes'][number] & {
        __typename: 'Product'
        id: string
        title: string
        handle: string
        images: NonNullable<SearchProductsResponse['search']['nodes'][number]['images']>
        priceRange: NonNullable<SearchProductsResponse['search']['nodes'][number]['priceRange']>
      } =>
        Boolean(
          node.id &&
            node.title &&
            node.handle &&
            node.images &&
            node.priceRange,
        ),
    )
    .map((node) => {
      const artistName = node.artist?.value?.trim() || 'Unknown'
      const styleTags = extractTagLabels(node.style)
      const themeTags = extractTagLabels(node.theme)
      const previewImageUrl = node.images.edges[0]?.node.url ?? ''

      return {
        availableForSale: availability,
        id: node.id,
        gid: node.id,
        title: node.title,
        slug: node.handle,
        previewImageUrl,
        artist: { name: artistName, slug: slugify(artistName) },
        price: String(node.priceRange.maxVariantPrice.amount),
        currencyCode: node.priceRange.maxVariantPrice.currencyCode,
        category: node.category?.value ?? null,
        orientation: node.orientation?.value ?? null,
        style: styleTags[0] ?? '',
        styleTags,
        medium: node.medium?.value ?? '',
        theme: themeTags[0] ?? '',
        themeTags,
        dimensionsImperial: node.dimensionsImperial?.value ?? '',
        dimensionsMetric: '',
      } satisfies Artwork
    })
}

export async function fetchFilteredShopifyPage(
  after: string | undefined,
  pageSize: number,
  sortOption: ArtworksSortOption,
  filters: ArtworksFilterState,
  availability: boolean = true,
): Promise<ArtworksPage> {
  const { sortKey, reverse } = getShopifySearchSortParams(sortOption)
  const { productFilters, searchQuery, requiresClientFallback } =
    await buildSearchProductFilters(filters, availability)

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

    const batchItems = toArtworkBatch(res.search.nodes, availability)
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
