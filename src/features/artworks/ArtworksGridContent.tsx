import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
  ArtworksSortOption,
} from '@/types/filters'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { ChevronDown, ListFilter } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  artworkFilterOptionsQueryOptions,
  useArtworksListing,
} from '@/hooks/useArtworksListing'
import { normalizeSinglePriceRangeValue } from '@/lib/artworks/price'
import { mergeFilterOptions } from '@/lib/artworks/utils'
import { useUrlStore } from '@/store/url-store'

import ArtworksFiltersSidebar from './ArtworksFiltersSidebar'
import ArtworksGrid from './ArtworksGrid'
import ArtworksGridSkeleton from './ArtworksGridSkeleton'

const DEFAULT_SORT: ArtworksSortOption = 'default'
const FILTER_KEYS: Array<keyof ArtworksFilterState> = [
  'styles',
  'categories',
  'themes',
  'artists',
  'priceRanges',
]
const EMPTY_FILTER_OPTIONS: ArtworksFilterOptions = {
  styles: [],
  categories: [],
  themes: [],
  artists: [],
}

function isSortOption(value: string | undefined): value is ArtworksSortOption {
  return (
    value === 'default' ||
    value === 'title-asc' ||
    value === 'title-desc' ||
    value === 'price-asc' ||
    value === 'price-desc'
  )
}

export default function ArtworksGridContent({
  showPrice = false,
  availability = true,
}: {
  showPrice: boolean
  availability?: boolean
}) {
  const query = useUrlStore.use.query()
  const setQuery = useUrlStore.use.setQuery()
  const setQueries = useUrlStore.use.setQueries()
  const syncQueryFromUrl = useUrlStore.use.syncQueryFromUrl()
  const hasSyncedFromUrlRef = useRef(false)

  const { data: remoteFilterOptions } = useQuery({
    ...artworkFilterOptionsQueryOptions,
  })

  const effectiveFilterOptions = remoteFilterOptions ?? EMPTY_FILTER_OPTIONS

  useEffect(() => {
    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search)
      syncQueryFromUrl(params)
    }

    if (!hasSyncedFromUrlRef.current) {
      hasSyncedFromUrlRef.current = true
      syncFromLocation()
    }

    window.addEventListener('popstate', syncFromLocation)
    return function cleanupPopStateListener() {
      window.removeEventListener('popstate', syncFromLocation)
    }
  }, [syncQueryFromUrl])

  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, values]) => {
      values.forEach((value) => {
        if (value) params.append(key, value)
      })
    })

    const searchString = params.toString()
    const nextUrl = searchString
      ? `${window.location.pathname}?${searchString}`
      : window.location.pathname
    const currentUrl = `${window.location.pathname}${window.location.search}`

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl)
    }
  }, [query])

  const [sortValue] = query['sort'] ?? []
  const parsedSortOption: ArtworksSortOption = isSortOption(sortValue)
    ? sortValue
    : DEFAULT_SORT

  const filters: ArtworksFilterState = {
    styles: query['styles'] ?? [],
    categories: query['categories'] ?? [],
    themes: query['themes'] ?? [],
    artists: query['artists'] ?? [],
    priceRanges: (() => {
      const single = normalizeSinglePriceRangeValue(query['priceRanges'] ?? [])
      return single ? [single] : []
    })(),
  }
  const hasActiveFilters = Object.values(filters).some(
    (values) => values.length > 0,
  )
  const disableTitleSort = !availability || hasActiveFilters
  const isTitleSortSelected =
    parsedSortOption === 'title-asc' || parsedSortOption === 'title-desc'
  const sortOption: ArtworksSortOption =
    disableTitleSort && isTitleSortSelected ? DEFAULT_SORT : parsedSortOption

  useEffect(() => {
    if (disableTitleSort && isTitleSortSelected) {
      setQuery('sort', undefined)
    }
  }, [disableTitleSort, isTitleSortSelected, setQuery])

  const {
    fallbackOptions,
    artworks: sortedArtworks,
    status,
    showLoadMoreButton,
    fetchNextPage,
    isFetchingNextPage,
  } = useArtworksListing({ sortOption, filters, availability })

  const availableOptions = useMemo<ArtworksFilterOptions>(() => {
    return mergeFilterOptions(effectiveFilterOptions, fallbackOptions)
  }, [effectiveFilterOptions, fallbackOptions])

  function handleFiltersChange(nextFilters: ArtworksFilterState) {
    const updates: Record<string, string[] | undefined> = {}
    FILTER_KEYS.forEach(function mapFilters(key) {
      const values = nextFilters[key]
      updates[key] = values.length > 0 ? values : undefined
    })

    setQueries(updates)
  }

  function handleClearFilters() {
    const cleared: Record<string, undefined> = {}
    FILTER_KEYS.forEach(function clearFilter(key) {
      cleared[key] = undefined
    })
    setQueries(cleared)
  }

  function handleSortChange(value: ArtworksSortOption) {
    setQuery('sort', value === DEFAULT_SORT ? undefined : value)
  }

  const sidebarWrapperRef = useRef<HTMLDivElement | null>(null)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState<number | null>(null)

  useEffect(() => {
    const wrapper = sidebarWrapperRef.current
    const content = sidebarRef.current
    if (!wrapper || !content) return

    const updateMeasurements = () => {
      const rect = wrapper.getBoundingClientRect()
      const available = Math.max(window.innerHeight - rect.top - 16, 160)
      setSidebarMaxHeight(available)

      const hasOverflow = content.scrollHeight > content.clientHeight + 2
      const atBottom =
        content.scrollTop + content.clientHeight >= content.scrollHeight - 2
      setShowScrollHint(hasOverflow && !atBottom)
    }

    const handleContentScroll = () => {
      const hasOverflow = content.scrollHeight > content.clientHeight + 2
      const atBottom =
        content.scrollTop + content.clientHeight >= content.scrollHeight - 2
      setShowScrollHint(hasOverflow && !atBottom)
    }

    const handleWindowChange = () => {
      window.requestAnimationFrame(updateMeasurements)
    }

    updateMeasurements()

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateMeasurements)
    })
    resizeObserver.observe(content)
    resizeObserver.observe(wrapper)

    content.addEventListener('scroll', handleContentScroll)
    window.addEventListener('resize', handleWindowChange)
    window.addEventListener('scroll', handleWindowChange, { passive: true })

    return () => {
      resizeObserver.disconnect()
      content.removeEventListener('scroll', handleContentScroll)
      window.removeEventListener('resize', handleWindowChange)
      window.removeEventListener('scroll', handleWindowChange)
    }
  }, [availableOptions])

  function handleScrollHintClick() {
    const el = sidebarRef.current
    if (!el) return
    el.scrollBy({ top: el.clientHeight * 0.6 || 160, behavior: 'smooth' })
  }

  return (
    <>
      {/* Mobile Filter & Sort */}
      <div className="flex justify-end lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex w-fit items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-2 font-medium shadow-sm shadow-neutral-200/60 outline-none">
              <ListFilter size={16} />
              Filter
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full">
            <SheetHeader>
              <SheetTitle>Filter & Sort</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-2 pb-2">
              <ArtworksFiltersSidebar
                sortOption={sortOption}
                onSortChange={handleSortChange}
                filters={filters}
                hasActiveFilters={disableTitleSort}
                showTitleSortOptions={availability}
                onFiltersChange={handleFiltersChange}
                availableOptions={availableOptions}
                onClearFilters={handleClearFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div
          ref={sidebarWrapperRef}
          className="hidden lg:sticky lg:top-36 lg:block lg:w-64 lg:shrink-0 lg:self-start"
        >
          <div className="relative">
            <div
              ref={sidebarRef}
              className="lg:overflow-y-auto lg:pr-2 lg:pb-6 lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
              style={
                typeof window !== 'undefined' &&
                window.innerWidth >= 1024 &&
                sidebarMaxHeight
                  ? { maxHeight: `${sidebarMaxHeight}px` }
                  : undefined
              }
            >
              <ArtworksFiltersSidebar
                sortOption={sortOption}
                onSortChange={handleSortChange}
                filters={filters}
                hasActiveFilters={disableTitleSort}
                showTitleSortOptions={availability}
                onFiltersChange={handleFiltersChange}
                availableOptions={availableOptions}
                onClearFilters={handleClearFilters}
              />
            </div>

            {showScrollHint && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 items-end justify-center bg-linear-to-t from-white via-white/90 to-transparent lg:flex"
              >
                <button
                  type="button"
                  onClick={handleScrollHintClick}
                  className="pointer-events-auto flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 shadow-xs transition hover:border-neutral-400 hover:text-neutral-800"
                >
                  <ChevronDown className="h-3 w-3" />
                  More filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {status === 'pending' ? (
            <ArtworksGridSkeleton />
          ) : status === 'error' ? (
            <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-red-600">
              Unable to load artworks. Please try again.
            </div>
          ) : sortedArtworks.length > 0 ? (
            <ArtworksGrid artworks={sortedArtworks} showPrice={showPrice} />
          ) : (
            <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
              No artworks match your current filters. Try adjusting or clearing
              them.
            </div>
          )}

          {showLoadMoreButton && (
            <button
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-auto block cursor-pointer rounded-full border border-black px-6 py-3 font-medium transition-colors duration-200 ease-in hover:bg-black hover:text-white disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
