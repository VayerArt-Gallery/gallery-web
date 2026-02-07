import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import HeroVideo from '@/components/HeroVideo'
import {
  AmexIcon,
  ApplePayIcon,
  GooglePayIcon,
  MastercardIcon,
  PaypalIcon,
  VisaIcon,
} from '@/components/icons/PaymentIcons'
import ArtworksGrid from '@/features/artworks/ArtworksGrid'
import EventsGrid from '@/features/events/EventsGrid'
import HighlightedArtistsGrid from '@/features/home/HighlightedArtistsGrid'
import { getHomeData } from '@/queries/sanity/homepage'

const homeDataQuery = queryOptions({
  queryKey: ['home-data'],
  queryFn: getHomeData,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
})

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeDataQuery),
  head: () => ({
    meta: [
      {
        title: 'VayerArt Gallery | Discover Contemporary Art',
        description:
          "Explore curator's picks, highlighted artists, and current exhibitions from VayerArt Gallery in Los Angeles, California.",
      },
    ],
    links: [
      {
        rel: 'preload',
        href: '/hero/hero-video.webm',
        as: 'video',
        type: 'video/webm',
        fetchPriority: 'high',
      },
    ],
  }),
  component: IndexPage,
})

function IndexPage() {
  const { data } = useSuspenseQuery(homeDataQuery)

  const curatorsPicks = data.curatorsPicks
  const featuredArtists = data.featuredArtists
  const featuredExhibitions = data.featuredExhibitions
  // const featuredFairs = data.featuredFairs

  return (
    <>
      <main>
        <HeroVideo
          posterSrc="/hero/hero-image.webp"
          videoSrc="/hero/hero-video.webm"
        />

        <section className="absolute top-[45%] left-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-8 text-white md:gap-10">
          <p className="mb-2 text-xl font-medium tracking-wide text-nowrap md:text-[1.75rem]">
            <span className="font-lora bg-white/85 bg-clip-text font-semibold text-transparent">
              Welcome to the VayerArt Gallery
            </span>
          </p>
          <p className="font-playfair mb-4 w-full text-2xl font-medium tracking-wide text-nowrap md:text-5xl md:tracking-[-0.0125rem]">
            Curated for the discerning eye.
          </p>
          <a
            href="#curators-picks"
            className="w-fit transform rounded-full border border-white bg-white/30 px-5 py-2 text-lg font-medium tracking-wide shadow-sm backdrop-blur-md transition duration-200 ease-in hover:bg-white hover:text-black md:px-6 md:py-3"
          >
            Explore the Gallery
          </a>
        </section>

        <section
          id="curators-picks"
          className="mt-8 scroll-mt-(--header-height)"
        >
          <h2 className="featured-headline">Curator's Picks</h2>
          <ArtworksGrid artworks={curatorsPicks} showPrice={false} />
        </section>

        <hr className="mb-4 w-full bg-neutral-400 md:mb-8" />

        <section>
          <h2 className="featured-headline">Exhibitions</h2>
          <EventsGrid events={featuredExhibitions} />
        </section>

        <hr className="mb-4 w-full bg-neutral-400 md:mb-8" />

        {/*
          <section>
            <h2 className="featured-headline">Fairs</h2>
            <EventsGrid events={featuredFairs} />
          </section>

          <hr className="mb-4 w-full bg-neutral-400 md:mb-8" />
        */}

        <section>
          <h2 className="featured-headline">Highlighted Artists</h2>
          <HighlightedArtistsGrid artists={featuredArtists} />
        </section>

        <hr className="mb-4 w-full bg-neutral-400 md:mb-8" />

        <section>
          <h3 className="featured-headline text-center md:text-2xl!">
            Secure Payment Options
          </h3>
          <div className="flex items-center justify-center gap-4">
            <VisaIcon />
            <AmexIcon />
            <PaypalIcon />
            <MastercardIcon />
            <ApplePayIcon />
            <GooglePayIcon />
          </div>
        </section>
      </main>
    </>
  )
}
