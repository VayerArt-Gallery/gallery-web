import type { Artist } from '@/types/artists'

import { sanityClient } from '@/lib/sanity-client'

const allArtistsQuery = `
  *[
    _type == "artist"
  ] | order(name asc) {
    "id": _id,
    name,
    "slug": slug.current,
    "artistImage": artistImage.asset->url,
    "backgroundImage": backgroundImage.asset->url,
    tagline,
    jobTitle,
    bio,
    _updatedAt,
    _createdAt
  }
`

const artistQuery = `
  *[
  _type == "artist"
  && slug.current == $slug
  ][0]{
    "id": _id,
    name,
    "slug": slug.current,
    "artistImage": artistImage.asset->url,
    "backgroundImage": backgroundImage.asset->url,
    tagline,
    jobTitle,
    bio,
    selectedWorks[]->{
      "id": _id,
      artist->{ name, "slug": slug.current },
      "description": store.descriptionHtml,
      dimensionsImperial,
      dimensionsMetric,
      "gid": store.gid,
      medium,
      "previewImageUrl": store.previewImageUrl,
      "currencyCode": "USD",
      "category": null,
      "price": store.priceRange.maxVariantPrice,
      "slug": store.slug.current,
      "style": artMovement,
      theme,
      "title": store.title
    },
  }
`

export async function getAllArtists(): Promise<Artist[]> {
  return sanityClient.fetch(allArtistsQuery)
}

export async function getArtist(slug: string): Promise<Artist> {
  return sanityClient.fetch(artistQuery, { slug })
}
