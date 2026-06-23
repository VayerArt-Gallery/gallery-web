import type { Artist } from '@/types/artists'

import { Link } from '@tanstack/react-router'

import {
  generateSanityGridSrcSet,
  SANITY_IMAGE_SIZES,
} from '@/lib/sanity-images'

type ArtistsGridProps = {
  artists: Omit<Artist, 'bio'>[] | undefined
}

export default function HighlightedArtistsGrid({ artists }: ArtistsGridProps) {
  return (
    artists &&
    artists.length !== 0 && (
      <div className="featured-grid-container">
        <div className="featured-grid">
          {artists.map((artist) => {
            return (
              <div key={artist.id}>
                <Link to="/artists/$slug" params={{ slug: artist.slug }}>
                  <div className="group relative">
                    <img
                      src={artist.artistImage}
                      srcSet={generateSanityGridSrcSet(artist.artistImage)}
                      sizes={SANITY_IMAGE_SIZES.grid}
                      alt={`A portrait image of the artist ${artist.name}`}
                      width={1920}
                      height={1080}
                      draggable={false}
                      className="z-10 aspect-[5/4] rounded object-cover select-none"
                    />
                    <img
                      src={artist.backgroundImage}
                      srcSet={generateSanityGridSrcSet(artist.backgroundImage)}
                      sizes={SANITY_IMAGE_SIZES.grid}
                      alt={`A portrait image of the artist ${artist.name}`}
                      width={1920}
                      height={1080}
                      draggable={false}
                      className="absolute top-0 right-0 left-0 -z-10 aspect-[5/4] rounded object-cover opacity-40 transition-all duration-200 ease-in-out select-none group-hover:opacity-85"
                    />
                  </div>

                  <div className="mt-5 flex flex-col">
                    <h3 className="hover:text-accent text-lg font-medium transition-colors duration-200">
                      {artist.name}
                    </h3>
                    <p className="text-sm font-medium text-neutral-500 italic">
                      {artist.tagline}
                    </p>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    )
  )
}
