import type { CurrencyCode } from '@/queries/graphql/generated/types'

export type Artwork = {
  availableForSale?: boolean
  artist: {
    name: string
    slug: string
  }
  currencyCode: CurrencyCode
  category: string | null
  dimensionsImperial: string
  dimensionsMetric: string
  gid: string
  id: string
  medium: string
  previewImageUrl: string
  price: string
  slug: string
  style: string
  styleTags?: string[]
  title: string
  theme: string
  themeTags?: string[]
}

export type LabeledMetaobject = {
  id: string
  handle: string
  label: string | null
}

export type ProductImage = {
  id: string
  url: string
  altText: string | null
  width: number | null
  height: number | null
}

// Normalized product from Shopify GraphQL
export type Product = {
  cursor: string
  availableForSale: boolean
  id: string
  handle: string
  title: string
  descriptionHtml: string
  artist: string | null
  category: string | null
  dimensionsImperial: string | null
  dimensionsMetric: string | null
  medium: string | null
  price: string
  currencyCode: CurrencyCode
  createdAt: string
  images: ProductImage[]
  style: LabeledMetaobject[]
  theme: LabeledMetaobject[]
}
