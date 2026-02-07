import type {
  Public_GetProductByHandleQuery,
  Public_GetProductByHandleQueryVariables,
} from '@/queries/graphql/generated/react-query'
import type { Artwork } from '@/types/products'

import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Skeleton } from '../../components/ui/skeleton'

import HoverSlideshow from '@/components/HoverSlideshow'
// import AddToBagBtn from '../bag/AddToBagBtn'

import { formatMoney } from '@/lib/normalizers/products'
import { cn } from '@/lib/utils'
import { fetcher } from '@/queries/graphql/fetcher'
import { Public_GetProductByHandleDocument } from '@/queries/graphql/generated/react-query'

type ArtworkGridItemProps = {
  artwork: Artwork
  index: number
  showPrice: boolean
  isArtistLinkActive: boolean
}

export function ArtworkGridItem({
  artwork,
  index,
  isArtistLinkActive,
  showPrice = false,
}: ArtworkGridItemProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [shouldFetchImages, setShouldFetchImages] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [playSignal, setPlaySignal] = useState(0)

  const href = `/artists/${artwork.artist.slug}`
  const { data: detail } = useQuery({
    queryKey: ['product-by-handle', artwork.slug, 'images'],
    queryFn: fetcher<
      Public_GetProductByHandleQuery,
      Public_GetProductByHandleQueryVariables
    >(Public_GetProductByHandleDocument, {
      handle: artwork.slug,
      imagesFirst: 6,
    }),
    enabled: shouldFetchImages,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const slideshowImages =
    detail?.productByHandle?.images.edges
      .map((edge) => edge.node.url)
      .filter(Boolean) ?? []

  useEffect(() => {
    if (isHovering && slideshowImages.length > 0) {
      setPlaySignal((n) => n + 1)
    }
  }, [isHovering, slideshowImages.length])

  const handleImageReady = () => {
    setIsImageLoaded(true)
  }

  const handleHover = () => {
    setIsHovering(true)
    setShouldFetchImages(true)
  }
  const handleLeave = () => setIsHovering(false)

  const priceDisplay = formatMoney(artwork.currencyCode, artwork.price)

  return (
    <div className="group animate-fade-in mb-2 flex flex-col items-start justify-start">
      <Link
        to="/artworks/$slug"
        params={{ slug: artwork.slug }}
        className="block w-full"
        onMouseEnter={handleHover}
        onFocus={handleHover}
        onMouseLeave={handleLeave}
        onBlur={handleLeave}
      >
        <div className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded border border-neutral-200/80 bg-neutral-50 transition-colors duration-100 ease-in select-none hover:bg-neutral-200/50">
          <Skeleton
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-2 rounded bg-neutral-200/70 transition-opacity duration-200 lg:inset-4 2xl:inset-6',
              isImageLoaded && 'pointer-events-none animate-none opacity-0',
            )}
          />
          <HoverSlideshow
            cover={artwork.previewImageUrl}
            images={slideshowImages}
            alt={`${artwork.title} by ${artwork.artist.name} - ${artwork.theme} - ${artwork.medium}`}
            loading={index <= 8 ? 'eager' : 'lazy'}
            className="h-full w-full"
            aspectClassName="aspect-[5/4]"
            imageClassName={cn(
              'max-h-full max-w-full object-contain p-2 transition-opacity duration-200 lg:p-4',
              isImageLoaded ? 'opacity-100' : 'opacity-0',
            )}
            objectFit="contain"
            onCoverLoad={handleImageReady}
            playSignal={playSignal}
          />
        </div>
      </Link>

      <div className="mt-2 md:mt-4">
        <h3 className="hover:text-accent mb-1 line-clamp-2 transition-colors duration-100 2xl:text-lg">
          <Link
            to={`/artworks/$slug`}
            params={{ slug: artwork.slug }}
            className="w-fit"
          >
            {artwork.title}
          </Link>
        </h3>

        <Link
          to={href}
          params={{ slug: artwork.artist.slug }}
          className={cn(
            'w-fit text-sm font-light tracking-wide transition-colors duration-100 md:text-[0.9375rem]',
            !isArtistLinkActive && 'hover:text-accent',
          )}
          disabled={isArtistLinkActive}
        >
          {artwork.artist.name}
        </Link>
      </div>

      <div className="w-full items-center justify-between space-y-0.5 text-neutral-500">
        <div>
          <p className="text-[0.8125rem] font-light tracking-wide md:font-normal">
            {artwork.medium}
          </p>
          <p className="text-xs font-light tracking-tight select-none md:font-normal md:tracking-normal">
            {artwork.dimensionsImperial}
          </p>
        </div>

        {showPrice && (
          <p className="mt-2 inline-flex items-center gap-1 text-sm text-neutral-500/80">
            {priceDisplay}
            {artwork.availableForSale === false && (
              <span className="text-rose-600">• Sold</span>
            )}
          </p>
        )}

        {/*
          <div className="mt-2">
            <AddToBagBtn type="minimal" product={artwork} />
          </div>
        */}
      </div>
    </div>
  )
}
