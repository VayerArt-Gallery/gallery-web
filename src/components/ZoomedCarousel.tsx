import { useEffect, useMemo, useState } from 'react'

import { X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import Carousel from './Carousel'

type ZoomedCarouselProps = {
  images: string[]
  open: boolean
  title?: string
  initialIndex?: number
  onOpenChange: (open: boolean) => void
}

export default function ZoomedCarousel({
  images,
  open,
  title,
  initialIndex,
  onOpenChange,
}: ZoomedCarouselProps) {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Check initial screen size
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const hasImages = images.length > 0
  const safeInitial = useMemo(() => {
    if (typeof initialIndex !== 'number') return 0
    const maxIndex = images.length - 1
    if (maxIndex <= 0) return 0
    if (initialIndex < 0) return 0
    if (initialIndex > maxIndex) return maxIndex
    return initialIndex
  }, [images.length, initialIndex])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onOpenChange(false)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="inset-0 flex h-full w-screen max-w-full translate-x-0 translate-y-0 items-center justify-center border-none bg-transparent p-0 sm:max-w-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Enlarged artwork carousel for {title ?? 'artwork'}
          </DialogDescription>
        </DialogHeader>

        {hasImages && (
          <div
            className="relative flex w-full flex-col overflow-hidden bg-black px-2 py-3 sm:px-6 sm:py-6"
            style={{
              height: '100vh',
              maxHeight: '-webkit-fill-available',
            }}
          >
            <div
              className="mx-auto flex h-full w-full max-w-5xl flex-col"
              style={{ minHeight: 0 }}
            >
              <Carousel
                images={images}
                enableZoom={false}
                imageVariant="zoom"
                initialSlide={safeInitial}
                showNavButtons={isDesktop && images.length > 1}
                wrapperClassName="flex h-full min-h-0 w-full flex-col items-center justify-center"
                carouselClassName="aspect-[5/4] w-full max-w-[700px]"
                imageClassName="max-h-full"
                thumbnailsClassName="mt-3 w-full max-w-[700px] flex-shrink-0 sm:mt-4"
                imageWrapperClassName="bg-black size-full"
                navButtonClassName="top-1/2 size-10 bg-black text-white -translate-y-1/2"
              />
            </div>

            <DialogClose
              type="button"
              className={cn(
                'focus-visible:ring-accent absolute top-3 right-3 z-10 flex items-center justify-center rounded-full bg-white/10 p-2 text-white transition-colors sm:top-6 sm:right-6',
                'hover:bg-white/20 focus-visible:ring-2 focus-visible:outline-hidden',
              )}
              aria-label="Close image gallery"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
