import type { ArtworksFilterOptions } from '@/types/filters'

type FilterKey = keyof ArtworksFilterOptions

export const FILTER_COLLECTION_PREFIXES: Record<FilterKey, string> = {
  styles: 'style-',
  categories: 'category-',
  themes: 'theme-',
  artists: 'artist-',
}

export const FILTER_COLLECTION_PREFIX_ENTRIES = Object.entries(
  FILTER_COLLECTION_PREFIXES,
) as Array<[FilterKey, string]>
