import type { EventTimeFilter } from '@/lib/events/utils'

import { useMemo, useState } from 'react'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import EventsGrid from '@/features/events/EventsGrid'
import { ITEMS_PER_PAGE } from '@/hooks/useArtworksListing'
import { filterEventsByTime, sortEventsByTime } from '@/lib/events/utils'
import { seo } from '@/lib/seo'
import { getAllExhibitions, getAllFairs } from '@/queries/sanity/events'

const exhibitionsQuery = queryOptions({
  queryKey: ['all-exhibitions'],
  queryFn: getAllExhibitions,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
})

const fairsQuery = queryOptions({
  queryKey: ['all-fairs'],
  queryFn: getAllFairs,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
})

export const Route = createFileRoute('/_pathlessLayout/events/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(exhibitionsQuery),
      context.queryClient.ensureQueryData(fairsQuery),
    ]).then(() => undefined),
  head: () => ({
    meta: [
      ...seo({
        title: 'Exhibitions & Art Fairs',
        description:
          'Stay current on VayerArt Gallery exhibitions and art fairs, filter by upcoming or past events, and plan your next visit.',
      }),
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const [exhibitionsFilter, setExhibitionsFilter] =
    useState<EventTimeFilter>('all')
  const [fairsFilter, setFairsFilter] = useState<EventTimeFilter>('all')
  const [exhibitionsPage, setExhibitionsPage] = useState(1)
  const [fairsPage, setFairsPage] = useState(1)

  const {
    data: exhibitions,
    isLoading: exhibitionIsLoading,
    error: exhibitionError,
  } = useSuspenseQuery(exhibitionsQuery)

  const {
    data: fairs,
    isLoading: fairIsLoading,
    error: fairError,
  } = useSuspenseQuery(fairsQuery)

  const sortedExhibitions = useMemo(
    () => sortEventsByTime(exhibitions),
    [exhibitions],
  )
  const sortedFairs = useMemo(() => sortEventsByTime(fairs), [fairs])

  const filteredExhibitions = useMemo(
    () => filterEventsByTime(sortedExhibitions, exhibitionsFilter),
    [sortedExhibitions, exhibitionsFilter],
  )
  const filteredFairs = useMemo(
    () => filterEventsByTime(sortedFairs, fairsFilter),
    [sortedFairs, fairsFilter],
  )

  const paginatedExhibitions = useMemo(
    () => filteredExhibitions.slice(0, exhibitionsPage * ITEMS_PER_PAGE),
    [filteredExhibitions, exhibitionsPage],
  )
  const paginatedFairs = useMemo(
    () => filteredFairs.slice(0, fairsPage * ITEMS_PER_PAGE),
    [filteredFairs, fairsPage],
  )

  const hasMoreExhibitions =
    filteredExhibitions.length > exhibitionsPage * ITEMS_PER_PAGE
  const hasMoreFairs = filteredFairs.length > fairsPage * ITEMS_PER_PAGE

  const handleExhibitionsFilterChange = (filter: EventTimeFilter) => {
    setExhibitionsFilter(filter)
    setExhibitionsPage(1)
  }

  const handleFairsFilterChange = (filter: EventTimeFilter) => {
    setFairsFilter(filter)
    setFairsPage(1)
  }

  return (
    <main className="page-main">
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="page-headline">Exhibitions</h2>
          <div className="flex gap-4 text-sm">
            <button
              onClick={() => handleExhibitionsFilterChange('all')}
              className={`transition-colors duration-200 ${
                exhibitionsFilter === 'all'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleExhibitionsFilterChange('current')}
              className={`transition-colors duration-200 ${
                exhibitionsFilter === 'current'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => handleExhibitionsFilterChange('past')}
              className={`transition-colors duration-200 ${
                exhibitionsFilter === 'past'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Past
            </button>
          </div>
        </div>
        {paginatedExhibitions.length > 0 ? (
          <>
            <EventsGrid events={paginatedExhibitions} />
            {hasMoreExhibitions && (
              <button
                onClick={() => setExhibitionsPage((prev) => prev + 1)}
                className="mx-auto mt-6 block cursor-pointer rounded-full border border-black px-6 py-3 font-medium transition-colors duration-200 ease-in hover:bg-black hover:text-white"
              >
                Show more
              </button>
            )}
          </>
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No {exhibitionsFilter} exhibitions
          </div>
        )}
      </section>

      <hr className="mb-4 w-full bg-neutral-400 md:mb-8" />

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="page-headline">Fairs</h2>
          <div className="flex gap-4 text-sm">
            <button
              onClick={() => handleFairsFilterChange('all')}
              className={`transition-colors duration-200 ${
                fairsFilter === 'all'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFairsFilterChange('current')}
              className={`transition-colors duration-200 ${
                fairsFilter === 'current'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => handleFairsFilterChange('past')}
              className={`transition-colors duration-200 ${
                fairsFilter === 'past'
                  ? 'font-medium text-black underline'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              Past
            </button>
          </div>
        </div>
        {paginatedFairs.length > 0 ? (
          <>
            <EventsGrid events={paginatedFairs} />
            {hasMoreFairs && (
              <button
                onClick={() => setFairsPage((prev) => prev + 1)}
                className="mx-auto mt-6 block cursor-pointer rounded-full border border-black px-6 py-3 font-medium transition-colors duration-200 ease-in hover:bg-black hover:text-white"
              >
                Show more
              </button>
            )}
          </>
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No {fairsFilter} fairs
          </div>
        )}
      </section>
    </main>
  )
}
