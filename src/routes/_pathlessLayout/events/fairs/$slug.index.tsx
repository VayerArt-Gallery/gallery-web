import type { Fair } from '@/types/fairs'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PortableText } from '@portabletext/react'

import Carousel from '@/components/Carousel'
import ArtistsGrid from '@/features/artists/ArtistsGrid'
import { formatDateRange } from '@/lib/utils'
import { getFair } from '@/queries/sanity/events'

function createFairQuery(slug: string) {
  const fairQuery = queryOptions({
    queryKey: ['fair', slug],
    queryFn: () => getFair(slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  return fairQuery
}

function generateSeoDescription(fair: Fair) {
  const dates = formatDateRange(fair.startDate, fair.endDate)
  const artistCount = fair.artists.length
  const artistSummary = `${artistCount} participating artist${artistCount === 1 ? '' : 's'}`

  const descriptionParts = [
    `Located in ${fair.location}`,
    `Running ${dates}`,
    artistSummary,
  ]

  return `${descriptionParts.join(' • ')}. Experience this fair with VayerArt Gallery.`
}

export const Route = createFileRoute('/_pathlessLayout/events/fairs/$slug/')({
  loader: ({ context, params }) => {
    const queryOpts = createFairQuery(params.slug)
    const queryResult = context.queryClient.ensureQueryData(queryOpts)
    return queryResult
  },
  head: ({ loaderData, params }) => {
    const description = loaderData
      ? generateSeoDescription(loaderData)
      : 'Explore the latest art fairs featuring VayerArt Gallery artists and works.'

    return {
      meta: [
        {
          title: loaderData?.title ?? params.slug,
          description,
          image: loaderData ? loaderData.images[0] : null,
          type: 'event',
        },
      ],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  const fairQuery = createFairQuery(slug)

  const { data: fair, isLoading, error } = useSuspenseQuery(fairQuery)

  const eventDates = formatDateRange(fair.startDate, fair.endDate)

  return (
    <main className="page-main mx-auto max-w-[1600px]">
      <h2 className="page-headline flex items-center gap-4">
        {fair.title} <span className="text-lg">•</span> {fair.location}
      </h2>
      <h3 className="-mt-6 font-medium tracking-wide text-neutral-500">
        {eventDates}
      </h3>

      <section className="animate-fade-in my-5 items-center justify-center lg:my-14 lg:flex">
        <Carousel images={fair.images} cdnType="sanity" />

        <article className="my-8 w-full gap-4 align-top tracking-wide text-pretty lg:my-0 lg:ml-8 lg:w-1/2 xl:ml-16 xl:w-[600px] xl:gap-8 2xl:ml-44 2xl:w-[700px]">
          <PortableText
            value={fair.body}
            components={{
              block: {
                normal: ({ children }) => <p className="mb-4">{children}</p>,
              },
            }}
          />
        </article>
      </section>

      <hr className="w-full bg-neutral-400" />

      <section className="my-6 lg:my-8">
        <h2 className="font-lora mb-6 text-xl font-medium md:text-2xl md:tracking-tight">
          Artists
        </h2>

        <ArtistsGrid artists={fair.artists} />
      </section>
    </main>
  )
}
