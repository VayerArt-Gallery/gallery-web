import type { SearchPageRouteState } from '@/features/search/searchPageState'
import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
  ArtworksSortOption,
} from '@/types/filters'

import { useEffect, useMemo, useState } from 'react'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

import { ChevronDown, ChevronUp, ListFilter } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import ArtworksFiltersSidebar from '@/features/artworks/ArtworksFiltersSidebar'
import ArtworksGrid from '@/features/artworks/ArtworksGrid'
import ArtworksGridSkeleton from '@/features/artworks/ArtworksGridSkeleton'
import SearchForm from '@/features/search/SearchForm'
import {
  EMPTY_SEARCH_FILTERS,
  getSearchDisplayQuery,
  normalizeSearchPageState,
  normalizeSearchQuery,
  toSearchPageFilters,
} from '@/features/search/searchPageState'
import { artworkFilterOptionsQueryOptions } from '@/hooks/useArtworksListing'
import { dedupeArtworks } from '@/lib/artworks/utils'
import { performSearch } from '@/queries/search'
import { createSearchArtworksInfiniteQueryOptions } from '@/queries/search-artworks'

const DEFAULT_SORT: ArtworksSortOption = 'default'
const EMPTY_FILTER_OPTIONS: ArtworksFilterOptions = {
  styles: [],
  categories: [],
  themes: [],
  artists: [],
  orientations: [],
}
const SEARCH_SUPPLEMENTARY_FADE_MS = 200

export const Route = createFileRoute('/_pathlessLayout/search/')({
  validateSearch: (search) => normalizeSearchPageState(search),
  loaderDeps: ({ search }) => ({
    query: search.q ?? '',
  }),
  loader: ({ context, deps }) => {
    void context.queryClient.ensureQueryData(artworkFilterOptionsQueryOptions)
    return {
      query: deps.query,
    }
  },
  head: ({ loaderData }) => {
    const query = normalizeSearchQuery(loaderData?.query)
    const displayQuery = getSearchDisplayQuery(query)
    const title = displayQuery ? `Searching for "${displayQuery}"` : 'Search'
    const description = query
      ? `Search results for ${query} across artworks, artists, exhibitions, and fairs at VayerArt Gallery.`
      : 'Search artworks, artists, exhibitions, and fairs at VayerArt Gallery.'

    return {
      meta: [
        {
          title,
          description,
        },
      ],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [searchInput, setSearchInput] = useState(search.q ?? '')

  useEffect(() => {
    setSearchInput(search.q ?? '')
  }, [search.q])

  const filters: ArtworksFilterState = toSearchPageFilters(search)

  const query = normalizeSearchQuery(search.q)
  const hasQuery = query.length > 0
  const hasActiveFilters = Object.values(filters).some(
    (values) => values.length > 0,
  )
  const sortOption = search.sort ?? DEFAULT_SORT

  const { data: remoteFilterOptions } = useQuery({
    ...artworkFilterOptionsQueryOptions,
  })

  const { data: sanityResults, isLoading: sanityLoading } = useQuery({
    queryKey: ['search-page-sanity', query],
    queryFn: () => performSearch(query),
    enabled: hasQuery,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const infiniteQueryOptions = useMemo(
    () =>
      createSearchArtworksInfiniteQueryOptions({
        searchTerm: query,
        filters,
        sortOption,
      }),
    [filters, query, sortOption],
  )

  const {
    data: artworkPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: artworksStatus,
  } = useInfiniteQuery({
    ...infiniteQueryOptions,
    select: (data) => data.pages.flatMap((page) => page.items),
  })

  const artworks = useMemo(
    () => dedupeArtworks(artworkPages ?? []),
    [artworkPages],
  )

  const availableOptions = remoteFilterOptions ?? EMPTY_FILTER_OPTIONS
  const hasArtworkResults = artworks.length > 0

  const updateSearchState = (
    nextState: Partial<SearchPageRouteState>,
    replace: boolean = true,
  ) => {
    void navigate({
      search: (previous) =>
        normalizeSearchPageState({
          ...previous,
          ...nextState,
        }),
      replace,
    })
  }

  const handleSearchSubmit = () => {
    const normalizedQuery = normalizeSearchQuery(searchInput)
    updateSearchState({ q: normalizedQuery || undefined }, false)
  }

  const handleFiltersChange = (nextFilters: ArtworksFilterState) => {
    updateSearchState(nextFilters)
  }

  const handleClearFilters = () => {
    updateSearchState({
      ...EMPTY_SEARCH_FILTERS,
    })
  }

  const handleSortChange = (nextSort: ArtworksSortOption) => {
    updateSearchState({
      sort: nextSort === DEFAULT_SORT ? undefined : nextSort,
    })
  }

  return (
    <main className="page-main min-w-full">
      <div className="mb-8 flex flex-wrap items-center gap-4 md:gap-6">
        <h2 className="page-headline mb-0! shrink-0 leading-none">
          Search Results
        </h2>

        <div className="ml-auto w-full max-w-3xl items-center rounded-xl border border-neutral-300 bg-white p-1.5 px-2 text-black sm:w-auto sm:flex-1 lg:max-w-xl">
          <SearchForm
            inputId="search-page-input"
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={handleSearchSubmit}
          />
        </div>
      </div>

      {!hasQuery ? (
        <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Enter a search term to explore artworks, artists, exhibitions, and
          fairs.
        </div>
      ) : (
        <div className="space-y-10">
          <SearchSupplementaryResults
            isLoading={sanityLoading}
            artists={sanityResults?.artists ?? []}
            exhibitions={sanityResults?.exhibitions ?? []}
            fairs={sanityResults?.fairs ?? []}
          />

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
                    hasActiveFilters={hasActiveFilters}
                    showTitleSortOptions={false}
                    onFiltersChange={handleFiltersChange}
                    availableOptions={availableOptions}
                    onClearFilters={handleClearFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <section className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="hidden lg:block lg:w-64 lg:shrink-0">
              <ArtworksFiltersSidebar
                sortOption={sortOption}
                onSortChange={handleSortChange}
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                showTitleSortOptions={false}
                onFiltersChange={handleFiltersChange}
                availableOptions={availableOptions}
                onClearFilters={handleClearFilters}
              />
            </div>

            <div className="flex-1 space-y-6">
              {artworksStatus === 'pending' ? (
                <ArtworksGridSkeleton />
              ) : hasArtworkResults ? (
                <ArtworksGrid artworks={artworks} showPrice={true} />
              ) : (
                <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                  No artworks match “{query}” with your current filters.
                </div>
              )}

              {hasNextPage && (
                <button
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mx-auto block cursor-pointer rounded-full border border-black px-6 py-3 font-medium transition-colors duration-200 ease-in hover:bg-black hover:text-white disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading…' : 'Show more'}
                </button>
              )}

              {/*
                {!hasArtworkResults &&
                !hasEntityResults &&
                artworksStatus !== 'pending' && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                    Try a shorter query or a different keyword.
                  </div>
                )}
              */}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

type SearchSupplementaryResultsProps = {
  artists: Awaited<ReturnType<typeof performSearch>>['artists']
  exhibitions: Awaited<ReturnType<typeof performSearch>>['exhibitions']
  fairs: Awaited<ReturnType<typeof performSearch>>['fairs']
  isLoading: boolean
}

type SupplementaryResultsState = Omit<
  SearchSupplementaryResultsProps,
  'isLoading'
>
type SupplementaryVisibilityState = Record<
  keyof SupplementaryResultsState,
  boolean
>

function getSupplementaryVisibility(
  results: SupplementaryResultsState,
): SupplementaryVisibilityState {
  return {
    artists: results.artists.length > 0,
    exhibitions: results.exhibitions.length > 0,
    fairs: results.fairs.length > 0,
  }
}

function SearchSupplementaryResults({
  artists,
  exhibitions,
  fairs,
  isLoading,
}: SearchSupplementaryResultsProps) {
  const incomingResults = useMemo(
    () => ({
      artists,
      exhibitions,
      fairs,
    }),
    [artists, exhibitions, fairs],
  )
  const [displayedResults, setDisplayedResults] =
    useState<SupplementaryResultsState>(incomingResults)
  const [visibleSections, setVisibleSections] =
    useState<SupplementaryVisibilityState>(() =>
      getSupplementaryVisibility(incomingResults),
    )

  useEffect(() => {
    if (isLoading) return

    const incomingVisibility = getSupplementaryVisibility(incomingResults)
    const displayedVisibility = getSupplementaryVisibility(displayedResults)
    const hasPresenceChange = (
      Object.keys(incomingVisibility) as Array<
        keyof SupplementaryVisibilityState
      >
    ).some((key) => incomingVisibility[key] !== displayedVisibility[key])

    if (!hasPresenceChange) {
      setDisplayedResults(incomingResults)
      setVisibleSections(incomingVisibility)
      return
    }

    const hasOutgoingSections = (
      Object.keys(displayedVisibility) as Array<
        keyof SupplementaryVisibilityState
      >
    ).some((key) => displayedVisibility[key] && !incomingVisibility[key])

    const retainedVisibility: SupplementaryVisibilityState = {
      artists: displayedVisibility.artists && incomingVisibility.artists,
      exhibitions:
        displayedVisibility.exhibitions && incomingVisibility.exhibitions,
      fairs: displayedVisibility.fairs && incomingVisibility.fairs,
    }

    let timeoutId: number | undefined
    let frameId: number | undefined

    const stageIncomingSections = () => {
      setDisplayedResults(incomingResults)
      setVisibleSections(retainedVisibility)
      frameId = window.requestAnimationFrame(() => {
        setVisibleSections(incomingVisibility)
      })
    }

    if (hasOutgoingSections) {
      setVisibleSections(retainedVisibility)
      timeoutId = window.setTimeout(
        stageIncomingSections,
        SEARCH_SUPPLEMENTARY_FADE_MS,
      )
    } else {
      stageIncomingSections()
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId)
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [displayedResults, incomingResults, isLoading])

  const hasArtists = displayedResults.artists.length > 0
  const hasExhibitions = displayedResults.exhibitions.length > 0
  const hasFairs = displayedResults.fairs.length > 0

  if (!hasArtists && !hasExhibitions && !hasFairs) {
    return null
  }

  return (
    <section className="space-y-8">
      <AnimatedVisibility show={visibleSections.artists}>
        <ResultGroup title="Artists">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {/* Artist Section */}
            {displayedResults.artists.map((artist) => (
              <Link
                key={artist.id}
                to="/artists/$slug"
                params={{ slug: artist.slug }}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 transition-colors hover:bg-neutral-50"
              >
                {artist.artistImage && (
                  <div className="size-20 overflow-hidden rounded-full border">
                    <img
                      src={artist.artistImage}
                      alt={artist.name}
                      className="size-full translate-x-0.5 -translate-y-3 scale-[140%] object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="truncate text-[0.9375rem] font-medium">
                    {artist.name}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </ResultGroup>
      </AnimatedVisibility>

      {/* Exhibitions Section */}
      <AnimatedVisibility show={visibleSections.exhibitions}>
        <ResultGroup title="Exhibitions">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {displayedResults.exhibitions.map((exhibition) => (
              <Link
                key={exhibition.id}
                to="/events/exhibitions/$slug"
                params={{ slug: exhibition.slug }}
                className="rounded-lg border border-neutral-200 p-2.5 transition-colors hover:bg-neutral-50"
              >
                {exhibition.coverImageUrl && (
                  <img
                    src={exhibition.coverImageUrl}
                    alt={exhibition.title}
                    className="mb-2 aspect-16/10 w-full rounded object-cover"
                  />
                )}
                <h4 className="line-clamp-2 text-[0.9375rem] font-medium">
                  {exhibition.title}
                </h4>
              </Link>
            ))}
          </div>
        </ResultGroup>
      </AnimatedVisibility>

      {/* Fairs Section */}
      <AnimatedVisibility show={visibleSections.fairs}>
        <ResultGroup title="Fairs">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {displayedResults.fairs.map((fair) => (
              <Link
                key={fair.id}
                to="/events/fairs/$slug"
                params={{ slug: fair.slug }}
                className="rounded-lg border border-neutral-200 p-2.5 transition-colors hover:bg-neutral-50"
              >
                {fair.coverImageUrl && (
                  <img
                    src={fair.coverImageUrl}
                    alt={fair.title}
                    className="mb-2 aspect-16/10 w-full rounded object-cover"
                  />
                )}
                <h4 className="line-clamp-2 text-[0.9375rem] font-medium">
                  {fair.title}
                </h4>
              </Link>
            ))}
          </div>
        </ResultGroup>
      </AnimatedVisibility>
    </section>
  )
}

function AnimatedVisibility({
  show,
  children,
}: {
  show: boolean
  children: React.ReactNode
}) {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    let timeoutId: number | undefined
    let frameId: number | undefined

    if (show) {
      setShouldRender(true)
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(true)
      })
    } else {
      setIsVisible(false)
      timeoutId = window.setTimeout(() => {
        setShouldRender(false)
      }, SEARCH_SUPPLEMENTARY_FADE_MS)
    }

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId)
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [show])

  if (!shouldRender) {
    return null
  }

  return (
    <div
      style={{ transitionDuration: `${SEARCH_SUPPLEMENTARY_FADE_MS}ms` }}
      className={[
        'transition-opacity ease-out motion-reduce:transition-none',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function ResultGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <h3 className="font-lora text-xl font-medium md:text-2xl md:tracking-tight">
          {title}
        </h3>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:hidden">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-1 py-2 text-left">
          <h3 className="font-lora text-lg font-medium tracking-tight">
            {title}
          </h3>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
      </Collapsible>

      <div className="hidden md:block">{children}</div>
    </div>
  )
}
