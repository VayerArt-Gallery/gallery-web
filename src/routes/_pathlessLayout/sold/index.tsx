import { createFileRoute } from '@tanstack/react-router'

import ArtworksGridContent from '@/features/artworks/ArtworksGridContent'
import { artworkFilterOptionsQueryOptions } from '@/hooks/useArtworksListing'
import { canonicalLinks, seo } from '@/lib/seo'

export const Route = createFileRoute('/_pathlessLayout/sold/')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(artworkFilterOptionsQueryOptions),
  head: () => ({
    meta: [
      ...seo({
        title: 'Sold Artworks',
        description:
          'Browse sold artworks from VayerArt Gallery, including past acquisitions by artist, style, and category.',
      }),
    ],
    links: canonicalLinks('/sold'),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="page-main min-w-full">
      <h1 className="page-headline">Sold</h1>
      <ArtworksGridContent showPrice={true} availability={false} />
    </main>
  )
}
