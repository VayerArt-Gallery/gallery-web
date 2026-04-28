import type { SearchProductsQuery } from './graphql/generated/react-query'
import type { Artist } from '@/types/artists'
import type { Exhibition } from '@/types/exhibitions'
import type { Fair } from '@/types/fairs'

import { queryOptions } from '@tanstack/react-query'

import { sanityClient } from '@/lib/sanity-client'

import { useSearchProductsQuery } from './graphql/generated/react-query'

// Sanity search queries
const searchArtistsQuery = `
  *[
    _type == "artist"
    && name match $searchTerm
  ] | order(name asc) [0...5] {
    "id": _id,
    name,
    "slug": slug.current,
    "artistImage": artistImage.asset->url,
  }
`

const searchExhibitionsQuery = `
  *[
    _type == "exhibition"
    && title match $searchTerm
  ] | order(startDate desc) [0...5] {
    "id": _id,
    "type": "exhibition",
    title,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url,
    startDate,
    endDate,
    artists[]->{
      "id": _id,
      name,
      "slug": slug.current,
      "artistImage": artistImage.asset->url,
      "backgroundImage": backgroundImage.asset->url,
      tagline,
    },
    body,
    images,
  }
`

const searchFairsQuery = `
  *[
    _type == "fair"
    && title match $searchTerm
  ] | order(startDate desc) [0...5] {
    "id": _id,
    "type": "fair",
    title,
    "slug": slug.current,
    "coverImageUrl": coverImage.asset->url,
    startDate,
    endDate,
    location
  }
`

export async function searchArtists(searchTerm: string): Promise<Artist[]> {
  const term = `*${searchTerm}*`
  return sanityClient.fetch(searchArtistsQuery, { searchTerm: term })
}

export async function searchExhibitions(
  searchTerm: string,
): Promise<Exhibition[]> {
  const term = `*${searchTerm}*`
  return sanityClient.fetch(searchExhibitionsQuery, { searchTerm: term })
}

export async function searchFairs(searchTerm: string): Promise<Fair[]> {
  const term = `*${searchTerm}*`
  return sanityClient.fetch(searchFairsQuery, { searchTerm: term })
}

// Shopify search (use the generated hook)
export { useSearchProductsQuery }

export type SearchResult = {
  artists: Artist[]
  exhibitions: Exhibition[]
  fairs: Fair[]
  products: SearchProductsQuery[] // Will be typed from Shopify response
}

export async function performSearch(
  searchTerm: string,
): Promise<Omit<SearchResult, 'products'>> {
  const [artists, exhibitions, fairs] = await Promise.all([
    searchArtists(searchTerm),
    searchExhibitions(searchTerm),
    searchFairs(searchTerm),
  ])

  return {
    artists,
    exhibitions,
    fairs,
  }
}

export function createSearchSupplementaryQueryOptions(searchTerm: string) {
  return queryOptions({
    queryKey: ['search-page-sanity', searchTerm],
    queryFn: () => performSearch(searchTerm),
    enabled: searchTerm.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
