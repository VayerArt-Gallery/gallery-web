import type { ArtworksFilterOptions } from '@/types/filters'
import type { Artwork } from '@/types/products'

import { slugify, slugifyName } from '@/lib/utils'

import { FILTER_COLLECTION_PREFIXES, FILTER_COLLECTION_PREFIX_ENTRIES } from './constants'

type FilterKey = keyof ArtworksFilterOptions

export function detectFilterKey(handle: string): FilterKey | undefined {
  for (const [key, prefix] of FILTER_COLLECTION_PREFIX_ENTRIES) {
    if (handle.startsWith(prefix)) return key
  }
  return undefined
}

export function formatCollectionTitleFromHandle(
  handle: string,
  type: FilterKey,
): string | undefined {
  const prefix = FILTER_COLLECTION_PREFIXES[type]
  if (!handle.startsWith(prefix)) return undefined
  const raw = handle.slice(prefix.length).trim()
  if (!raw) return undefined
  return raw
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function normalizeCollectionTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export function resolveCollectionHandlesForArtist(name: string): string[] {
  const handles = new Set<string>()

  const primary = slugifyName(name)
  const fallback = slugify(name)

  ;[primary, fallback].forEach((variant) => {
    if (!variant) return
    handles.add(`artist-${variant}`)
  })

  return Array.from(handles)
}

export function getCollectionMetaForHandle(
  handle: string,
  collectionHandleToTitle: Record<FilterKey, Map<string, string>>,
): { type: FilterKey; title: string } | undefined {
  for (const [type, prefix] of FILTER_COLLECTION_PREFIX_ENTRIES) {
    if (!handle.startsWith(prefix)) continue
    const existing = collectionHandleToTitle[type].get(handle)
    const title = existing ?? formatCollectionTitleFromHandle(handle, type)
    if (title) return { type, title }
  }
  return undefined
}

export function applyCollectionMetadataToArtworks(
  handle: string,
  items: Artwork[],
  collectionHandleToTitle: Record<FilterKey, Map<string, string>>,
): Artwork[] {
  const meta = getCollectionMetaForHandle(handle, collectionHandleToTitle)
  if (!meta) return items

  switch (meta.type) {
    case 'categories':
      return items.map((artwork) => {
        if (artwork.category === meta.title) return artwork
        return { ...artwork, category: meta.title }
      })
    case 'styles':
      return items.map((artwork) => {
        if (artwork.style === meta.title) return artwork
        const existingTags = (artwork as Artwork & { styleTags?: string[] })
          .styleTags
        const nextTags = Array.isArray(existingTags)
          ? Array.from(new Set([...existingTags, meta.title]))
          : [meta.title]
        return { ...artwork, style: meta.title, styleTags: nextTags }
      })
    case 'themes':
      return items.map((artwork) => {
        if (artwork.theme === meta.title) return artwork
        const existingTags = (artwork as Artwork & { themeTags?: string[] })
          .themeTags
        const nextTags = Array.isArray(existingTags)
          ? Array.from(new Set([...existingTags, meta.title]))
          : [meta.title]
        return { ...artwork, theme: meta.title, themeTags: nextTags }
      })
    case 'artists':
      return items.map((artwork) => {
        if (artwork.artist.name === meta.title) return artwork
        return {
          ...artwork,
          artist: {
            ...artwork.artist,
            name: meta.title,
            slug: slugify(meta.title),
          },
        }
      })
    default:
      return items
  }
}
