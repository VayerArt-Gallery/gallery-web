import type { ArtworksFilterOptions } from '@/types/filters'
import type { Artwork } from '@/types/products'

/**
 * Deduplicate artworks by their global ID (gid).
 * Keeps the first occurrence of each artwork.
 */
export function dedupeArtworks(artworks: Artwork[]): Artwork[] {
  if (artworks.length === 0) return artworks

  const seen = new Set<string>()
  const unique: Artwork[] = []

  artworks.forEach((artwork) => {
    const key = artwork.gid
    if (!key || seen.has(key)) return
    seen.add(key)
    unique.push(artwork)
  })

  return unique
}

/**
 * Merge two filter option sets, combining and sorting values.
 */
export function mergeFilterOptions(
  primary: ArtworksFilterOptions,
  fallback: ArtworksFilterOptions,
): ArtworksFilterOptions {
  const mergeValues = (primaryValues: string[], fallbackValues: string[]) => {
    const set = new Set(primaryValues)
    fallbackValues.forEach((value) => set.add(value))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }

  return {
    styles: mergeValues(primary.styles, fallback.styles),
    categories: mergeValues(primary.categories, fallback.categories),
    themes: mergeValues(primary.themes, fallback.themes),
    artists: mergeValues(primary.artists, fallback.artists),
    orientations: mergeValues(primary.orientations, fallback.orientations),
  }
}
