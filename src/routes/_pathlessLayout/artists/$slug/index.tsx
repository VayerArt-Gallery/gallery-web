import type { EventTimeFilter } from '@/lib/events/utils'

import { useMemo, useState } from 'react'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { PortableText } from '@portabletext/react'

import ArtworksGrid from '@/features/artworks/ArtworksGrid'
import ArtworksGridSkeleton from '@/features/artworks/ArtworksGridSkeleton'
import EventsGrid from '@/features/events/EventsGrid'
import { useArtistArtworksListing } from '@/hooks/useArtistArtworksListing'
import { ITEMS_PER_PAGE } from '@/hooks/useArtworksListing'
import { filterEventsByTime, sortEventsByTime } from '@/lib/events/utils'
import { canonicalLinks, seo } from '@/lib/seo'
import { jsonLdScript, personSchema } from '@/lib/structured-data'
import { getArtist } from '@/queries/sanity/artists'
import { getExhibitionsWithArtist } from '@/queries/sanity/events'

function createArtistQuery(slug: string) {
  return queryOptions({
    queryKey: [`artist-${slug}`],
    queryFn: () => getArtist(slug),
  })
}
function createExhibitionsQuery(slug: string) {
  return queryOptions({
    queryKey: [`${slug}-exhibitions`],
    queryFn: () => getExhibitionsWithArtist(slug),
  })
}
// function createFairsQuery(slug: string) {
//   return queryOptions({
//     queryKey: [`${slug}-fairs`],
//     queryFn: () => getFairsWithArtist(slug),
//   })
// }

export const Route = createFileRoute('/_pathlessLayout/artists/$slug/')({
  loader: async ({ context, params }) => {
    const artistPromise = context.queryClient.ensureQueryData(
      createArtistQuery(params.slug),
    )

    const [artist] = await Promise.all([
      artistPromise,
      context.queryClient.ensureQueryData(createExhibitionsQuery(params.slug)),
      // context.queryClient.ensureQueryData(createFairsQuery(params.slug)),
    ])

    return { artist }
  },
  head: ({ loaderData, params }) => {
    const artist = loaderData?.artist
    const title = artist?.name ?? params.slug
    const description = `Explore exhibitions, fairs, and selected works by ${title} at VayerArt Gallery in Los Angeles, California.`

    return {
      meta: [
        ...seo({
          title,
          description,
          image: artist?.artistImage ?? null,
          type: 'profile',
        }),
      ],
      links: canonicalLinks(`/artists/${params.slug}`),
      scripts: artist ? [jsonLdScript(personSchema(artist))] : undefined,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  const [exhibitionsFilter, setExhibitionsFilter] =
    useState<EventTimeFilter>('all')
  const [fairsFilter, setFairsFilter] = useState<EventTimeFilter>('all')
  const [exhibitionsPage, setExhibitionsPage] = useState(1)
  // const [fairsPage, setFairsPage] = useState(1)

  const artistQuery = createArtistQuery(slug)
  const exhibitionsQuery = createExhibitionsQuery(slug)
  // const fairsQuery = createFairsQuery(slug)

  const { data: artist } = useSuspenseQuery(artistQuery)
  const { data: exhibitions } = useSuspenseQuery(exhibitionsQuery)
  // const { data: fairs } = useSuspenseQuery(fairsQuery)

  const selectedWorks = artist.selectedWorks

  const {
    artworks: artistArtworks,
    status: artworksStatus,
    isPending: artworksPending,
    showLoadMoreButton,
    fetchNextPage,
    isFetchingNextPage,
  } = useArtistArtworksListing({
    artistName: artist.name,
    artistSlug: slug,
    selectedWorks,
  })

  const sortedExhibitions = useMemo(
    () => sortEventsByTime(exhibitions),
    [exhibitions],
  )
  // const sortedFairs = useMemo(() => sortEventsByTime(fairs), [fairs])

  const filteredExhibitions = useMemo(
    () => filterEventsByTime(sortedExhibitions, exhibitionsFilter),
    [sortedExhibitions, exhibitionsFilter],
  )
  // const filteredFairs = useMemo(
  //   () => filterEventsByTime(sortedFairs, fairsFilter),
  //   [sortedFairs, fairsFilter],
  // )

  const paginatedExhibitions = useMemo(
    () => filteredExhibitions.slice(0, exhibitionsPage * ITEMS_PER_PAGE),
    [filteredExhibitions, exhibitionsPage],
  )
  // const paginatedFairs = useMemo(
  //   () => filteredFairs.slice(0, fairsPage * ITEMS_PER_PAGE),
  //   [filteredFairs, fairsPage],
  // )

  const hasMoreExhibitions =
    filteredExhibitions.length > exhibitionsPage * ITEMS_PER_PAGE
  // const hasMoreFairs = filteredFairs.length > fairsPage * ITEMS_PER_PAGE

  const handleExhibitionsFilterChange = (filter: EventTimeFilter) => {
    setExhibitionsFilter(filter)
    setExhibitionsPage(1)
  }

  const handleFairsFilterChange = (filter: EventTimeFilter) => {
    setFairsFilter(filter)
    // setFairsPage(1)
  }

  const hasAnyExhibitions = exhibitions.length > 0
  // const hasAnyFairs = fairs.length > 0

  const hasArtworks = artistArtworks.length > 0
  const showArtworksSection =
    artworksPending || artworksStatus === 'error' || hasArtworks

  return (
    <main className="page-main mx-auto max-w-[1600px]">
      <h1 className="page-headline">{artist.name}</h1>

      <section className="animate-fade-in my-5 items-start justify-center lg:my-14 lg:flex">
        <div className="group relative">
          <img
            src={artist.artistImage}
            alt={`A portrait image of the artist ${artist.name}`}
            width={1920}
            height={1080}
            className="animate-fade-in z-10 aspect-square self-start object-cover grayscale-100 lg:max-w-[400px] xl:max-w-[500px] 2xl:max-w-[700px]"
          />
          <img
            src={artist.backgroundImage}
            alt={`A portrait image of the artist ${artist.name}`}
            width={1920}
            height={1080}
            className="absolute top-0 right-0 left-0 -z-10 aspect-square object-cover opacity-45 transition-all duration-100 ease-in group-hover:opacity-85"
          />
        </div>

        <article className="my-6 flex flex-col items-start gap-2 self-start align-top md:my-8 md:flex-row md:gap-4 lg:my-0 lg:ml-8 lg:w-1/2 xl:ml-16 xl:w-[600px] xl:gap-8 2xl:ml-24 2xl:w-[900px]">
          <h2 className="mb-3 text-xl font-medium tracking-wide lg:mb-0 lg:text-base">
            Biography
          </h2>

          <div className="w-full tracking-wide text-pretty">
            <PortableText
              value={artist.bio}
              components={{
                block: {
                  normal: ({ children }) => <p className="mb-4">{children}</p>,
                },
              }}
            />
          </div>
        </article>
      </section>

      {hasAnyExhibitions && (
        <>
          <hr className="w-full bg-neutral-400" />
          <section className="my-6 lg:my-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-lora text-xl font-medium md:text-2xl md:tracking-tight">
                Exhibitions
              </h2>
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
        </>
      )}

      {showArtworksSection && (
        <>
          <hr className="w-full bg-neutral-400" />
          <section className="my-8 lg:my-10">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-lora text-xl font-medium md:text-2xl md:tracking-tight">
                Artworks
              </h2>
              <Link
                to="/artworks"
                search={{
                  artists: artist.name,
                }}
                className="hover:text-foreground text-sm text-neutral-500 transition-colors duration-200"
              >
                View all
              </Link>
            </div>

            {artworksPending ? (
              <ArtworksGridSkeleton />
            ) : artworksStatus === 'error' ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-red-600">
                Unable to load selected works. Please try again later.
              </div>
            ) : hasArtworks ? (
              <ArtworksGrid artworks={artistArtworks} showPrice={true} />
            ) : (
              <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                No artworks are currently available.
              </div>
            )}

            {showLoadMoreButton && (
              <button
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mx-auto mt-6 block w-fit cursor-pointer rounded-full border border-black px-6 py-3 font-medium transition-colors duration-200 ease-in hover:bg-black hover:text-white disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading…' : 'Show more'}
              </button>
            )}
          </section>
        </>
      )}
    </main>
  )
}

{
  /*
  Hiding fairs on client request
  {hasAnyFairs && (
  <>
    <hr className="w-full bg-neutral-400" />
    <section className="my-6 lg:my-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-lora text-xl font-medium md:text-2xl md:tracking-tight">
          Fairs
        </h2>
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
  </>
)}
*/
}
