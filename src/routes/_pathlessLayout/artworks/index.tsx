import { createFileRoute } from '@tanstack/react-router'

import ArtworksGridContent from '@/features/artworks/ArtworksGridContent'
import { artworkFilterOptionsQueryOptions } from '@/hooks/useArtworksListing'
import {
  DEFAULT_ARTWORKS_TITLE,
  getArtworksCanonicalPath,
  getArtworksHeading,
  getArtworksMetaTitle,
  normalizeArtworksListingSearch,
} from '@/lib/artworks/listingMeta'
import { canonicalLinks, seo } from '@/lib/seo'

export const Route = createFileRoute('/_pathlessLayout/artworks/')({
  // NOTE: no `validateSearch` here on purpose. Filter URLs are plain repeated
  // params (?styles=Abstract) owned by the client url-store; adding
  // validateSearch makes the router canonicalize them into JSON-encoded arrays
  // and 307-redirect, which would break both the filter UX and these SEO URLs.
  // We read the raw search read-only to derive the heading + meta title.
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(artworkFilterOptionsQueryOptions)
    const filters = normalizeArtworksListingSearch(deps.search)
    return {
      heading: getArtworksHeading(filters),
      metaTitle: getArtworksMetaTitle(filters),
      canonicalPath: getArtworksCanonicalPath(filters),
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      ...seo({
        title: loaderData?.metaTitle ?? DEFAULT_ARTWORKS_TITLE,
        description:
          'Buy contemporary art, abstract oil paintings, and original watercolor art online. Explore landscape paintings from Florida and Texas at VayerArt Gallery today.',
      }),
    ],
    links: canonicalLinks(loaderData?.canonicalPath ?? '/artworks'),
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { heading } = Route.useLoaderData()

  return (
    <main className="page-main min-w-full">
      <h1 className="page-headline">{heading}</h1>
      <ArtworksGridContent showPrice={true} />
    </main>
  )
}
