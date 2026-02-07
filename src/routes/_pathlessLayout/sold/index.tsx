import { createFileRoute } from '@tanstack/react-router'

import ArtworksGridContent from '@/features/artworks/ArtworksGridContent'
import { artworkFilterOptionsQueryOptions } from '@/hooks/useArtworksListing'

export const Route = createFileRoute('/_pathlessLayout/sold/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(artworkFilterOptionsQueryOptions),
  head: () => ({
    meta: [
      {
        title: 'Sold Artworks',
        description:
          'Browse sold artworks from VayerArt Gallery, including past acquisitions by artist, style, and category.',
      },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="page-main min-w-full">
      <h2 className="page-headline">Sold</h2>
      <ArtworksGridContent showPrice={true} availability={false} />
    </main>
  )
}
