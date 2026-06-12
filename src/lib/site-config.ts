/**
 * Canonical site + business (NAP) constants.
 *
 * Single source of truth for the production origin, brand name, and the
 * Name/Address/Phone details used across canonical URLs, social meta, and
 * structured data (LocalBusiness, Organization, Event, …). Keeping these in one
 * place ensures NAP consistency, which matters for local SEO.
 */

export const SITE_URL = 'https://vayerartgallery.com'

// Official registered business name (used as-is in structured data).
export const BUSINESS_NAME = 'VayerArt Gallery'

export const LOGO_URL = `${SITE_URL}/logo-black.webp`

export const TELEPHONE = '+1 (818) 770-4643'

export const POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '17233 Warrington Drive',
  addressLocality: 'Granada Hills',
  addressRegion: 'CA',
  postalCode: '91344',
  addressCountry: 'US',
} as const

export const GEO_COORDINATES = {
  latitude: 34.292541,
  longitude: -118.509436,
} as const

export const SAME_AS = [
  'https://www.facebook.com/vayerartgallery',
  'https://www.instagram.com/vayerart_gallery',
  'https://www.youtube.com/@VayerArtGallery',
  'https://www.pinterest.com/vayerart/',
]
