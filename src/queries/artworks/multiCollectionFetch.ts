import type { ArtworksPage, ArtworksPageParam } from './types'
import type { ArtworksSortOption } from '@/types/filters'
import type { Artwork } from '@/types/products'

import {
  filterArtworksByPriceRanges,
  normalizePriceRangeValues,
} from '@/lib/artworks/price'
import { collectionHandleToTitle } from './collections'
import { fetchCollectionProductsPage } from './fetchers'
import { applyCollectionMetadataToArtworks } from './utils'

export async function fetchArtworksForCollectionHandles(
  handles: string[],
  pageParam: ArtworksPageParam,
  pageSize: number,
  sortOption: ArtworksSortOption,
  selectedPriceRanges: string[] = [],
): Promise<ArtworksPage> {
  const uniqueHandles = Array.from(new Set(handles.filter(Boolean)))
  if (uniqueHandles.length === 0) {
    return {
      source: 'shopify',
      items: [],
      pageInfo: { hasNextPage: false, endCursor: undefined },
      collectionHandles: [],
      cursorsByHandle: {},
      bufferedByHandle: undefined,
    }
  }

  const previousCursors = pageParam.cursorsByHandle ?? {}
  const previousBuffers = pageParam.bufferedByHandle ?? {}

  const cursors = new Map<string, string | null | undefined>()
  const buffers = new Map<string, Artwork[]>(
    uniqueHandles.map((handle) => [
      handle,
      Array.isArray(previousBuffers[handle])
        ? [...previousBuffers[handle]]
        : [],
    ]),
  )

  uniqueHandles.forEach((handle) => {
    if (Object.prototype.hasOwnProperty.call(previousCursors, handle)) {
      cursors.set(handle, previousCursors[handle])
    } else {
      cursors.set(handle, undefined)
    }
  })

  const delivered: Artwork[] = []
  const seen = new Set<string>()
  const normalizedRanges = normalizePriceRangeValues(selectedPriceRanges)

  const perHandleFetchSize = Math.max(
    Math.ceil(pageSize / uniqueHandles.length) *
      (normalizedRanges.length > 0 ? 2 : 1),
    6,
  )

  async function loadBuffer(handle: string) {
    let cursor = cursors.get(handle)
    if (cursor === null) return
    const existingBuffer = buffers.get(handle)
    if (existingBuffer && existingBuffer.length > 0) return

    let attempts = 0
    const maxAttempts = normalizedRanges.length > 0 ? 4 : 1

    while (cursor !== null && attempts < maxAttempts) {
      attempts += 1

      const page = await fetchCollectionProductsPage(
        handle,
        cursor ?? undefined,
        perHandleFetchSize,
        sortOption,
      )

      const adjusted = applyCollectionMetadataToArtworks(
        handle,
        page.items,
        collectionHandleToTitle,
      )
      const filtered = filterArtworksByPriceRanges(adjusted, normalizedRanges)
      if (filtered.length > 0) {
        const existing = buffers.get(handle)
        buffers.set(handle, existing ? existing.concat(filtered) : [...filtered])
      }

      const nextCursor = page.pageInfo.hasNextPage
        ? (page.pageInfo.endCursor ?? null)
        : null
      cursors.set(handle, nextCursor)
      cursor = nextCursor

      const refreshed = buffers.get(handle)
      if (refreshed && refreshed.length > 0) return
    }
  }

  const activeHandles = new Set(uniqueHandles)

  while (delivered.length < pageSize && activeHandles.size > 0) {
    const handlesNeedingLoad = Array.from(activeHandles).filter((handle) => {
      const buffer = buffers.get(handle)
      if (buffer && buffer.length > 0) return false
      const cursor = cursors.get(handle)
      if (cursor === null) {
        activeHandles.delete(handle)
        return false
      }
      return true
    })

    await Promise.all(
      handlesNeedingLoad.map(async (handle) => {
        try {
          await loadBuffer(handle)
          const updated = buffers.get(handle)
          if (!updated || updated.length === 0) {
            const nextCursor = cursors.get(handle)
            if (nextCursor === null) {
              activeHandles.delete(handle)
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              'Failed to load collection products for handle',
              handle,
              error,
            )
          }
          activeHandles.delete(handle)
        }
      }),
    )

    const candidates: Array<{ handle: string; artwork: Artwork }> = []
    for (const handle of activeHandles) {
      const buffer = buffers.get(handle)
      if (buffer && buffer.length > 0) {
        candidates.push({ handle, artwork: buffer[0] })
      }
    }

    if (candidates.length === 0) break

    const selected = candidates[0]

    const key = selected.artwork.gid || selected.artwork.id
    const buffer = buffers.get(selected.handle) ?? []
    buffer.shift()
    buffers.set(selected.handle, buffer)

    if (!key || seen.has(key)) {
      if (buffer.length === 0 && cursors.get(selected.handle) === null) {
        activeHandles.delete(selected.handle)
      }
      continue
    }

    seen.add(key)
    delivered.push(selected.artwork)

    if (buffer.length === 0 && cursors.get(selected.handle) === null) {
      activeHandles.delete(selected.handle)
    }
  }

  const nextCursors: Record<string, string | null | undefined> = {}
  const nextBuffers: Record<string, Artwork[]> = {}

  uniqueHandles.forEach((handle) => {
    const buffer = buffers.get(handle) ?? []
    const cursor = cursors.get(handle)
    nextCursors[handle] = cursor
    if (buffer.length > 0) {
      nextBuffers[handle] = buffer
    }
  })

  const hasMore = uniqueHandles.some((handle) => {
    if (handle in nextBuffers) return true // buffer only exists if length > 0
    const cursor = nextCursors[handle]
    return cursor !== null && cursor !== undefined
  })

  return {
    source: 'shopify',
    items: delivered,
    pageInfo: { hasNextPage: hasMore, endCursor: undefined },
    collectionHandles: uniqueHandles,
    cursorsByHandle: nextCursors,
    bufferedByHandle:
      Object.keys(nextBuffers).length > 0 ? nextBuffers : undefined,
  }
}
