import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import ArtistsGrid from '@/features/artists/ArtistsGrid'
import { seo } from '@/lib/seo'
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
        title: 'Artists',
        description:
          'Meet the artists represented by VayerArt Gallery and explore their latest works, exhibitions, and creative practices.',
      }),
    ],
  }),
  component: ArtistsPage,
})

function ArtistsPage() {
  const { data: artists, isLoading, error } = useSuspenseQuery(artistsQuery)

  return (
    <main className="page-main">
      <h2 className="page-headline">Artists</h2>
      <ArtistsGrid artists={artists} />
    </main>
  )
}
