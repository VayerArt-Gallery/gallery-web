import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import ArtistsGrid from '@/features/artists/ArtistsGrid'
import { canonicalLinks, seo } from '@/lib/seo'
import { getAllArtists } from '@/queries/sanity/artists'

const artistsQuery = queryOptions({
  queryKey: ['all-artists'],
  queryFn: getAllArtists,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
})

export const Route = createFileRoute('/_pathlessLayout/artists/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  head: () => ({
    meta: [
      ...seo({
        title: 'Buy Original Paintings from Local Artists | VayerArt Gallery',
        description:
          "Explore paintings by talented Florida, Texas & Miami artists. Find original works from local painters you won't see anywhere else. Shop the collection today.",
      }),
    ],
    links: canonicalLinks('/artists'),
  }),
  component: ArtistsPage,
})

function ArtistsPage() {
  const { data: artists, isLoading, error } = useSuspenseQuery(artistsQuery)

  return (
    <main className="page-main">
      <h1 className="page-headline">Artists</h1>
      <ArtistsGrid artists={artists} />
    </main>
  )
}
