import type { CollectionSummary } from './types'
import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
} from '@/types/filters'

import { slugify } from '@/lib/utils'

import {
  COLLECTIONS_FETCH_MAX_PAGES,
  COLLECTIONS_FETCH_PAGE_SIZE,
  EMPTY_FILTER_OPTIONS,
  FILTER_COLLECTION_PREFIXES,
} from './constants'
import { fetchCollectionsPage } from './fetchers'
import {
  normalizeCollectionTitle,
  resolveCollectionHandlesForArtist,
} from './utils'

type FilterKey = keyof ArtworksFilterOptions

const FILTER_KEYS: FilterKey[] = ['styles', 'categories', 'themes', 'artists']

type LookupMaps = Record<FilterKey, Map<string, string>>

function createLookupMaps(): LookupMaps {
  return {
    styles: new Map(),
    categories: new Map(),
    themes: new Map(),
    artists: new Map(),
  }
}

const collectionHandleLookup: LookupMaps = createLookupMaps()
const collectionTitleLookup: LookupMaps = createLookupMaps()
export const collectionHandleToTitle: LookupMaps = createLookupMaps()

let lastSuccessfulOptions: ArtworksFilterOptions | null = null

function syncLookupMaps(target: LookupMaps, source: LookupMaps) {
  FILTER_KEYS.forEach((key) => {
    const targetMap = target[key]
    const sourceMap = source[key]
    targetMap.clear()
    sourceMap.forEach((value, entryKey) => {
      targetMap.set(entryKey, value)
    })
  })
}

function addCollectionToOptions(
  collection: CollectionSummary,
  optionSets: {
    styles: Set<string>
    categories: Set<string>
    themes: Set<string>
    artists: Set<string>
  },
  lookups: {
    handleLookup: LookupMaps
    titleLookup: LookupMaps
    handleToTitle: LookupMaps
  },
): boolean {
  const { handle, title } = collection
  if (!handle || !title) return false

  const entry = Object.entries(FILTER_COLLECTION_PREFIXES).find(([_, prefix]) =>
    handle.startsWith(prefix),
  ) as [FilterKey, string] | undefined

  if (!entry) return false

  const [type] = entry
  const normalizedTitle = title.trim()
  if (!normalizedTitle) return false

  const canonical = normalizeCollectionTitle(normalizedTitle)
  const seenTitles = lookups.titleLookup[type]
  if (seenTitles.has(canonical)) {
    if (!lookups.handleToTitle[type].has(handle)) {
      lookups.handleToTitle[type].set(handle, normalizedTitle)
    }
    return false
  }

  seenTitles.set(canonical, normalizedTitle)
  optionSets[type].add(normalizedTitle)
  if (!lookups.handleLookup[type].has(normalizedTitle)) {
    lookups.handleLookup[type].set(normalizedTitle, handle)
  }
  if (!lookups.handleToTitle[type].has(handle)) {
    lookups.handleToTitle[type].set(handle, normalizedTitle)
  }
  return true
}

function normalizeHandleFromValue(
  type: keyof typeof FILTER_COLLECTION_PREFIXES,
  value: string,
): string | undefined {
  // Don't use cached lookup - always build handle fresh from the value
  // This prevents stale data in production server-side rendering
  const slug = slugify(value)
  if (!slug) return undefined
  return `${FILTER_COLLECTION_PREFIXES[type]}${slug}`
}

function resolveHandlesForArtist(value: string): string[] {
  // Don't use cached lookup - always build handles fresh from the artist name
  // This prevents stale data in production server-side rendering
  return resolveCollectionHandlesForArtist(value)
}

function resolveHandlesForFilter(
  type: FilterKey,
  value: string,
): string[] {
  if (!value) return []
  if (type === 'artists') {
    return resolveHandlesForArtist(value)
  }

  const handle = normalizeHandleFromValue(type, value)
  return handle ? [handle] : []
}

export function buildFilterCollectionHandles(
  filters: ArtworksFilterState,
): string[] {
  const allHandles = new Set<string>()

  FILTER_KEYS.forEach((key) => {
    const values = filters[key]
    values.forEach((value) => {
      resolveHandlesForFilter(key, value).forEach((handle) => {
        if (handle) allHandles.add(handle)
      })
    })
  })

  return Array.from(allHandles)
}

export async function fetchFilterOptions(): Promise<ArtworksFilterOptions> {
  const nextHandleLookup = createLookupMaps()
  const nextTitleLookup = createLookupMaps()
  const nextHandleToTitle = createLookupMaps()

  const optionSets = {
    styles: new Set<string>(),
    categories: new Set<string>(),
    themes: new Set<string>(),
    artists: new Set<string>(),
  }

  let after: string | undefined = undefined
  let hasNextPage = true
  let iterations = 0
  let encounteredError = false

  while (hasNextPage && iterations < COLLECTIONS_FETCH_MAX_PAGES) {
    iterations += 1

    let page: Awaited<ReturnType<typeof fetchCollectionsPage>>
    try {
      page = await fetchCollectionsPage(after, COLLECTIONS_FETCH_PAGE_SIZE)
    } catch (error) {
      encounteredError = true
      console.error('Failed to fetch filter collections page', error)
      break
    }

    page.items.forEach((collection) => {
      addCollectionToOptions(collection, optionSets, {
        handleLookup: nextHandleLookup,
        titleLookup: nextTitleLookup,
        handleToTitle: nextHandleToTitle,
      })
    })

    hasNextPage = page.pageInfo.hasNextPage
    after = page.pageInfo.endCursor
  }

  if (encounteredError) {
    if (lastSuccessfulOptions) {
      return lastSuccessfulOptions
    }
    return EMPTY_FILTER_OPTIONS
  }

  const hasAnyOptions = Object.values(optionSets).some((set) => set.size > 0)

  if (!hasAnyOptions) {
    if (lastSuccessfulOptions) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[filter-options] no collections discovered (using cached options)',
        )
      }
      return lastSuccessfulOptions
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[filter-options] no collections discovered')
    }
    return EMPTY_FILTER_OPTIONS
  }

  const nextOptions: ArtworksFilterOptions = {
    styles: Array.from(optionSets.styles).sort((a, b) => a.localeCompare(b)),
    categories: Array.from(optionSets.categories).sort((a, b) =>
      a.localeCompare(b),
    ),
    themes: Array.from(optionSets.themes).sort((a, b) => a.localeCompare(b)),
    artists: Array.from(optionSets.artists).sort((a, b) => a.localeCompare(b)),
  }

  syncLookupMaps(collectionHandleLookup, nextHandleLookup)
  syncLookupMaps(collectionTitleLookup, nextTitleLookup)
  syncLookupMaps(collectionHandleToTitle, nextHandleToTitle)

  lastSuccessfulOptions = nextOptions

  return nextOptions
}
