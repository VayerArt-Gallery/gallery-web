import type { Artist } from '@/types/artists'

import { Link } from '@tanstack/react-router'

import {
  generateSanitySrcSet,
  SANITY_DETAIL_SRC_SET_WIDTHS,
  SANITY_IMAGE_SIZES,
} from '@/lib/sanity-images'

type ArtistsGridProps = {
  artists: Omit<Artist, 'bio'>[] | undefined
}

export default function ArtistsGrid({ artists }: ArtistsGridProps) {
  return (
    artists &&
    artists.length !== 0 && (
      <div className="animate-fade-in mb-8 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {artists.map((artist) => {
            return (
              <div key={artist.id} className="mb-2">
                <Link
                  to="/artists/$slug"
                  params={{ slug: artist.slug }}
                  className="group relative block"
                >
                  <div className="relative">
                    <img
                      src={artist.backgroundImage}
                      srcSet={generateSanitySrcSet(
                        artist.backgroundImage,
                        SANITY_DETAIL_SRC_SET_WIDTHS,
                      )}
                      sizes={SANITY_IMAGE_SIZES.splitGrid}
                      alt={`A portrait of the artist ${artist.name}`}
                      width={1920}
                      height={1080}
                      draggable={false}
                      className="absolute inset-0 z-0 h-full w-full rounded-xs object-cover opacity-45 transition-opacity duration-100 ease-in select-none group-hover:opacity-85"
                    />
                    <img
                      src={artist.artistImage}
                      srcSet={generateSanitySrcSet(
                        artist.artistImage,
                        SANITY_DETAIL_SRC_SET_WIDTHS,
                      )}
                      sizes={SANITY_IMAGE_SIZES.splitGrid}
                      alt={`A portrait of the artist ${artist.name}`}
                      width={1920}
                      height={1080}
                      draggable={false}
                      className="relative z-20 aspect-[3/2] rounded-xs object-cover select-none lg:aspect-[4/2] lg:object-contain 2xl:aspect-[2.25]"
                    />
                  </div>

                  <div className="relative z-30 mt-1 flex w-fit flex-col justify-center transition-colors duration-200 group-hover:text-white md:absolute md:top-8 md:right-0 md:left-0 md:mx-auto md:mt-5 md:items-center">
                    <h3 className="font-playfair w-fit text-lg font-medium md:text-xl lg:text-2xl xl:text-4xl">
                      {artist.name}
                    </h3>
                    <p className="text-sm font-medium text-neutral-800 italic transition-colors duration-200 group-hover:text-white md:text-base lg:mt-1 lg:text-lg lg:tracking-wide">
                      {artist.tagline}
                    </p>
                  </div>

                  <div className="absolute inset-x-0 top-0 z-10 mx-auto h-[45%] w-full bg-gradient-to-b from-white/30 via-white/20 to-transparent transition-colors duration-200 ease-in group-hover:from-black/30 group-hover:via-black/20" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    )
  )
}
