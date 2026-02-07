import type { ArtworksFilterState } from '@/types/filters'
import type { Artwork } from '@/types/products'

import { matchesSelectedPriceRanges } from './price'

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('en-US')
}

function hasAnyMatch(selected: string[], candidates: Array<string | null | undefined>): boolean {
  if (selected.length === 0) return true

  const candidateSet = new Set(
    candidates.map((value) => normalizeText(value)).filter(Boolean),
  )
  if (candidateSet.size === 0) return false

  return selected.some((value) => candidateSet.has(normalizeText(value)))
}

export function matchesArtworkFilters(
  artwork: Artwork,
  filters: ArtworksFilterState,
): boolean {
  if (
    !hasAnyMatch(filters.categories, [artwork.category]) ||
    !hasAnyMatch(filters.artists, [artwork.artist.name]) ||
    !hasAnyMatch(filters.styles, [artwork.style, ...(artwork.styleTags ?? [])]) ||
    !hasAnyMatch(filters.themes, [artwork.theme, ...(artwork.themeTags ?? [])])
  ) {
    return false
  }

  return matchesSelectedPriceRanges(artwork.price, filters.priceRanges)
}

export function filterArtworksByFilters(
  artworks: Artwork[],
  filters: ArtworksFilterState,
): Artwork[] {
  const hasAnyFilter = Object.values(filters).some((values) => values.length > 0)
  if (!hasAnyFilter) return artworks

  return artworks.filter((artwork) => matchesArtworkFilters(artwork, filters))
}
