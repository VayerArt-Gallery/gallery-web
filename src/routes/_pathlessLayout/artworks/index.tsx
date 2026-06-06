import { createFileRoute } from '@tanstack/react-router'

import ArtworksGridContent from '@/features/artworks/ArtworksGridContent'
import { artworkFilterOptionsQueryOptions } from '@/hooks/useArtworksListing'
import { seo } from '@/lib/seo'

export const Route = createFileRoute('/_pathlessLayout/artworks/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(artworkFilterOptionsQueryOptions),
  head: () => ({
    meta: [
      ...seo({
        title: 'Artworks Collection',
        description:
          'Browse VayerArt Gallery’s curated selection of contemporary artworks, filter by style, medium, or artist, and discover your next acquisition.',
      }),
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="page-main min-w-full">
      <h2 className="page-headline">Artworks</h2>
      <ArtworksGridContent showPrice={true} />
    </main>
  )
}
