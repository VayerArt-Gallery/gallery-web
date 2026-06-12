import type { ArtworksFilterState } from '@/types/filters'

/**
 * Heading + meta-title derivation for the artworks listing route.
 *
 * The visible <h1> stays intentionally concise (just the active filter's label,
 * e.g. "Abstract" or "Vahe Yeremyan"), while the keyword-rich phrasing lives in
 * the meta <title>. Both are derived from the same single source so they never
 * disagree, and both are computed from the route's validated search params so
 * they render server-side (which is what makes them count for SEO).
 */

export const DEFAULT_ARTWORKS_HEADING = 'Artworks'
const BRAND_SUFFIX = ' | VayerArt Gallery'
export const DEFAULT_ARTWORKS_TITLE = `Contemporary & Landscape Paintings for Sale${BRAND_SUFFIX}`

// Every filter dimension, used to decide whether a single facet is active.
const FILTER_DIMENSIONS: Array<keyof ArtworksFilterState> = [
  'styles',
  'categories',
  'themes',
  'artists',
  'orientations',
  'priceRanges',
]

// Dimensions whose value reads well as a page heading. Orientation and price
// ranges are deliberately excluded — they don't make meaningful titles.
type HeadingDimension = 'artists' | 'styles' | 'themes' | 'categories'
const HEADING_DIMENSIONS: HeadingDimension[] = [
  'artists',
  'styles',
  'themes',
  'categories',
]

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? [trimmed] : []
  }

  return []
}

/** Parses raw search params into filter state for the route's `validateSearch`. */
export function normalizeArtworksListingSearch(
  search: Record<string, unknown>,
): ArtworksFilterState {
  return {
    styles: toStringArray(search.styles),
    categories: toStringArray(search.categories),
    themes: toStringArray(search.themes),
    artists: toStringArray(search.artists),
    orientations: toStringArray(search.orientations),
    priceRanges: toStringArray(search.priceRanges),
  }
}

/**
 * Returns the active facet only when exactly one heading-worthy dimension holds
 * exactly one value. Any other shape (no filters, multiple values, multiple
 * dimensions, or a non-heading dimension like orientation) returns null.
 */
function getSingleActiveFilter(
  filters: ArtworksFilterState,
): { dimension: HeadingDimension; value: string } | null {
  const activeDimensions = FILTER_DIMENSIONS.filter(
    (dimension) => filters[dimension].length > 0,
  )

  if (activeDimensions.length !== 1) return null

  const [dimension] = activeDimensions
  const values = filters[dimension]
  if (values.length !== 1) return null
  if (!HEADING_DIMENSIONS.includes(dimension as HeadingDimension)) return null

  return { dimension: dimension as HeadingDimension, value: values[0] }
}

/** Concise visible <h1>: the active facet's label, or "Artworks". */
export function getArtworksHeading(filters: ArtworksFilterState): string {
  return getSingleActiveFilter(filters)?.value ?? DEFAULT_ARTWORKS_HEADING
}

/** Keyword-rich meta <title> for the active facet, or the default. */
export function getArtworksMetaTitle(filters: ArtworksFilterState): string {
  const active = getSingleActiveFilter(filters)
  if (!active) return DEFAULT_ARTWORKS_TITLE

  switch (active.dimension) {
    case 'artists':
      return `${active.value} Art Collection${BRAND_SUFFIX}`
    case 'styles':
    case 'themes':
      return `Original ${active.value} Paintings for Sale${BRAND_SUFFIX}`
    case 'categories':
      return `${active.value} for Sale${BRAND_SUFFIX}`
  }
}

/**
 * Self-referencing canonical path for the artworks listing.
 *
 * Only the keyword facets (the heading dimensions) are kept, sorted for a
 * stable form — so meaningful facet URLs (e.g. ?styles=Abstract) stay canonical
 * to themselves, while noise filters (orientation, price, sort) and param-order
 * variations consolidate to the same canonical instead of bloating the index.
 */
export function getArtworksCanonicalPath(filters: ArtworksFilterState): string {
  const params = new URLSearchParams()

  for (const dimension of [...HEADING_DIMENSIONS].sort()) {
    for (const value of [...filters[dimension]].sort()) {
      params.append(dimension, value)
    }
  }

  const query = params.toString()
  return query ? `/artworks?${query}` : '/artworks'
}
