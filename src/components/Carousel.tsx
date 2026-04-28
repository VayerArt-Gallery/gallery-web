import type { CarouselApi } from '@/components/ui/carousel'

import { useEffect, useMemo, useState } from 'react'

import useEmblaCarousel from 'embla-carousel-react'

import {
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Carousel as CarouselRoot,
} from '@/components/ui/carousel'
import { generateSanitySrcSet, SANITY_IMAGE_SIZES } from '@/lib/sanity-images'
import { cn } from '@/lib/utils'
import { generateShopifySrcSet, SHOPIFY_IMAGE_SIZES } from '@/lib/shopify-images'

import CarouselThumbnail from './CarouselThumbnail'

type CarouselProps = {
  images: string[]
  enableZoom?: boolean
  onImageClick?: (index: number) => void
  initialSlide?: number
  wrapperClassName?: string
  carouselClassName?: string
  imageClassName?: string
  thumbnailsClassName?: string
  imageWrapperClassName?: string
  showNavButtons?: boolean
  navButtonClassName?: string
  cdnType?: 'shopify' | 'sanity'
}

export default function Carousel({
  images,
  enableZoom = false,
  onImageClick,
  initialSlide,
  wrapperClassName,
  carouselClassName,
  imageClassName,
  thumbnailsClassName,
  imageWrapperClassName,
  showNavButtons = false,
  navButtonClassName,
  cdnType = 'shopify',
}: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [thumbsRef, thumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
  })

  const clampedInitialSlide = useMemo(() => {
    if (typeof initialSlide !== 'number') return undefined
    if (images.length === 0) return 0

    const maxIndex = images.length - 1
    if (initialSlide < 0) return 0
    if (initialSlide > maxIndex) return maxIndex
    return initialSlide
  }, [initialSlide, images.length])

  useEffect(() => {
    if (!carouselApi) return

    const update = () => {
      const idx = carouselApi.selectedScrollSnap()
      setCurrentSlide(idx)
      thumbsApi?.scrollTo(idx)
    }

    update()

    carouselApi.on('select', update).on('reInit', update)
  }, [carouselApi, thumbsApi])

  // Ensures selected thumbnail is zoomed
  useEffect(() => {
    if (!carouselApi) return
    if (typeof clampedInitialSlide !== 'number') return

    carouselApi.scrollTo(clampedInitialSlide, true)
    thumbsApi?.scrollTo(clampedInitialSlide)
    setCurrentSlide(clampedInitialSlide)
  }, [carouselApi, thumbsApi, clampedInitialSlide])

  const isInteractive = enableZoom && typeof onImageClick === 'function'
  const generateSrcSet =
    cdnType === 'sanity' ? generateSanitySrcSet : generateShopifySrcSet
  const imageSizes =
    cdnType === 'sanity' ? SANITY_IMAGE_SIZES.detail : SHOPIFY_IMAGE_SIZES.detail

  const handleImageClick = (index: number) => {
    if (isInteractive) {
      onImageClick(index)
    }
  }

  return (
    <div className={wrapperClassName}>
      <CarouselRoot
        setApi={setCarouselApi}
        opts={{ startIndex: 0, skipSnaps: false, loop: true }}
        className={cn('mx-auto aspect-[5/4] max-w-[700px]', carouselClassName)}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={image}>
              <div
                className={cn(
                  'bg-neutral-100',
                  isInteractive && 'cursor-zoom-in focus:outline-hidden',
                  imageWrapperClassName,
                )}
                aria-label={
                  isInteractive
                    ? `View image ${index + 1} of ${images.length} in fullscreen`
                    : undefined
                }
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={image}
                  srcSet={generateSrcSet(image)}
                  sizes={imageSizes}
                  width="1920"
                  height="1080"
                  className={cn(
                    'animate-fade-in mx-auto aspect-[5/4] h-full rounded-md object-contain',
                    imageClassName,
                  )}
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {showNavButtons && (
          <>
            <CarouselPrevious className={navButtonClassName} />
            <CarouselNext className={navButtonClassName} />
          </>
        )}
      </CarouselRoot>

      {images.length > 1 && (
        <div
          className={cn(
            'mx-auto mt-3 w-full max-w-[700px]',
            thumbnailsClassName,
          )}
        >
          <div ref={thumbsRef} className="overflow-hidden">
            <div className="-ml-2 flex">
              {images.map((image, index) => (
                <div
                  key={image}
                  className="min-w-0 shrink-0 basis-[calc(100%/5.5)] pl-2"
                >
                  <CarouselThumbnail
                    images={images}
                    selected={index === currentSlide}
                    index={index}
                    onClick={() => {
                      setCurrentSlide(index)
                      carouselApi?.scrollTo(index)
                      thumbsApi?.scrollTo(index)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
