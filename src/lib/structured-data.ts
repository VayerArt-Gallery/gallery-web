import type { Exhibition } from '@/types/exhibitions'
import type { Fair } from '@/types/fairs'

import {
  BUSINESS_NAME,
  GEO_COORDINATES,
  LOGO_URL,
  POSTAL_ADDRESS,
  SAME_AS,
  SITE_URL,
  TELEPHONE,
} from './site-config'

/**
 * JSON-LD structured data builders.
 *
 * Each returns a plain object; wrap with `jsonLdScript()` and add to a route's
 * `head().scripts`. Event/Person schemas are generated from live Sanity data so
 * they never go stale.
 */

/** Wraps a schema object into a head `<script type="application/ld+json">`. */
export function jsonLdScript(data: unknown) {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data),
  }
}

const ORGANIZER = {
  '@type': 'Organization',
  name: BUSINESS_NAME,
  url: `${SITE_URL}/`,
}

const GALLERY_PLACE = {
  '@type': 'Place',
  name: BUSINESS_NAME,
  address: POSTAL_ADDRESS,
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BUSINESS_NAME,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    sameAs: SAME_AS,
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BUSINESS_NAME,
    url: `${SITE_URL}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/** LocalBusiness, using the more specific `ArtGallery` type. */
export function artGallerySchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ArtGallery',
    '@id': `${SITE_URL}/#artgallery`,
    name: BUSINESS_NAME,
    image: LOGO_URL,
    url: `${SITE_URL}/`,
    telephone: TELEPHONE,
    address: POSTAL_ADDRESS,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: GEO_COORDINATES.latitude,
      longitude: GEO_COORDINATES.longitude,
    },
    sameAs: SAME_AS,
  }
}

export function mainNavBreadcrumbSchema() {
  const items = [
    { name: 'Home', path: '/' },
    { name: 'Artists', path: '/artists' },
    { name: 'Artworks', path: '/artworks' },
    { name: 'Exhibitions & Fairs', path: '/events' },
    { name: 'Blog', path: '/blog' },
    { name: 'Sold', path: '/sold' },
    { name: 'About', path: '/about' },
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

export function personSchema(artist: {
  name: string
  slug: string
  artistImage: string
  jobTitle?: string
}) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Person',
    name: artist.name,
    url: `${SITE_URL}/artists/${artist.slug}`,
    image: artist.artistImage,
    // Dedicated SEO field, seeded from the SEO report (omitted if unset).
    ...(artist.jobTitle ? { jobTitle: artist.jobTitle } : {}),
  }
}

export function exhibitionEventSchema(exhibition: Exhibition, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: exhibition.title,
    description,
    image: exhibition.images?.[0] ?? exhibition.coverImageUrl,
    startDate: exhibition.startDate,
    endDate: exhibition.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: GALLERY_PLACE,
    organizer: ORGANIZER,
    performer: exhibition.artists.map((artist) => ({
      '@type': 'Person',
      name: artist.name,
    })),
  }
}

export function fairEventSchema(fair: Fair, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: fair.title,
    description,
    image: fair.images?.[0] ?? fair.coverImageUrl,
    startDate: fair.startDate,
    endDate: fair.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // A fair is hosted at an external venue, not the gallery.
    location: {
      '@type': 'Place',
      name: fair.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: fair.location,
      },
    },
    organizer: ORGANIZER,
    performer: fair.artists.map((artist) => ({
      '@type': 'Person',
      name: artist.name,
    })),
  }
}
