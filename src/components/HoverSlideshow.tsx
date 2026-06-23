import { useEffect, useMemo, useRef, useState } from 'react'

import {
  generateSanityGridSrcSet,
  SANITY_IMAGE_SIZES,
} from '@/lib/sanity-images'
import {
  generateShopifyGridSrcSet,
  SHOPIFY_IMAGE_SIZES,
} from '@/lib/shopify-images'
import { cn } from '@/lib/utils'

type HoverSlideshowProps = {
  cover: string
  images?: string[]
  alt: string
  cdnType?: 'shopify' | 'sanity'
  className?: string
  aspectClassName?: string
  imageClassName?: string
  objectFit?: 'cover' | 'contain'
  loading?: 'lazy' | 'eager'
  delayMs?: number
  intervalMs?: number
  fadeMs?: number
  onCoverLoad?: () => void
  playSignal?: number
}

export default function HoverSlideshow({
  cover,
  images = [],
  alt,
  cdnType = 'shopify',
  className,
  aspectClassName = 'aspect-[5/4]',
  imageClassName,
  objectFit = 'cover',
  loading = 'lazy',
  delayMs = 200,
  intervalMs = 2000,
  fadeMs = 200,
  onCoverLoad,
  playSignal = 0,
}: HoverSlideshowProps) {
  // Select the appropriate srcset generator based on CDN type
  const generateSrcSet =
    cdnType === 'sanity' ? generateSanityGridSrcSet : generateShopifyGridSrcSet
  const imageSizes =
    cdnType === 'sanity' ? SANITY_IMAGE_SIZES.grid : SHOPIFY_IMAGE_SIZES.grid
  const [hoverCapable, setHoverCapable] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hoverQuery = window.matchMedia('(hover: hover)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updateHover = (event: MediaQueryList | MediaQueryListEvent) =>
      setHoverCapable(event.matches)
    const updateMotion = (event: MediaQueryList | MediaQueryListEvent) =>
      setReduceMotion(event.matches)

    updateHover(hoverQuery)
    updateMotion(motionQuery)

    hoverQuery.addEventListener('change', updateHover)
    motionQuery.addEventListener('change', updateMotion)

    return () => {
      hoverQuery.removeEventListener('change', updateHover)
      motionQuery.removeEventListener('change', updateMotion)
    }
  }, [])

  // Cover first (for wrap), drop falsy + later duplicates
  const slides = useMemo(() => {
    const seen = new Set<string>()
    return [cover, ...images].filter(Boolean).filter((u) => {
      if (seen.has(u)) return false
      seen.add(u)
      return true
    })
  }, [images, cover])

  const [playing, setPlaying] = useState(false)
  const startRef = useRef<() => void>(() => {})

  // Double-buffered overlays for smooth cross-fades
  const [aSrc, setASrc] = useState<string | null>(null)
  const [bSrc, setBSrc] = useState<string | null>(null)
  const [frontIsA, setFrontIsA] = useState(true)
  const frontRef = useRef(true) // keep latest value inside timers

  const idxRef = useRef(0)
  const delayRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const switchingRef = useRef(false)
  const activeRef = useRef(false) // cancels async work on mouse out

  const clearTimers = () => {
    if (delayRef.current) {
      clearTimeout(delayRef.current)
      delayRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const stop = () => {
    activeRef.current = false
    clearTimers()
    setPlaying(false)
    setASrc(null)
    setBSrc(null)
    setFrontIsA(true)
    frontRef.current = true
    idxRef.current = 0
    switchingRef.current = false
  }

  // Decode helper with a small cache to avoid decoding the same URL repeatedly
  const decodedSetRef = useRef<Set<string>>(new Set())
  function decodeImage(src: string) {
    return new Promise<void>((resolve) => {
      if (!src) return resolve()
      const cache = decodedSetRef.current
      if (cache.has(src)) return resolve()

      const img = new Image()
      img.decoding = 'async'
      img.src = src

      const finalize = () => {
        cache.add(src)
        resolve()
      }
      const canDecode = typeof img.decode === 'function'
      if (img.complete) {
        if (canDecode) {
          img.decode().then(finalize).catch(finalize)
        } else finalize()
      } else {
        img.onload = () => {
          if (canDecode) {
            img.decode().then(finalize).catch(finalize)
          } else finalize()
        }
        img.onerror = finalize
      }
    })
  }

  const scheduleNext = () => {
    timeoutRef.current = window.setTimeout(
      runTick,
      Math.max(intervalMs, fadeMs + 50),
    )
  }

  const runTick = async () => {
    if (!activeRef.current || switchingRef.current || slides.length <= 1) return
    switchingRef.current = true

    const nextIdx = (idxRef.current + 1) % slides.length
    const nextSrc = slides[nextIdx]

    await decodeImage(nextSrc)

    // Load into hidden buffer
    if (frontRef.current) setBSrc(nextSrc)
    else setASrc(nextSrc)

    // Preload one ahead
    const pre = new Image()
    pre.src = slides[(nextIdx + 1) % slides.length]

    // Ensure src commit lands before flipping opacity
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFrontIsA((wasA) => {
          const nowA = !wasA
          frontRef.current = nowA
          return nowA
        })
        idxRef.current = nextIdx
        switchingRef.current = false
        if (activeRef.current) scheduleNext()
      })
    })
  }

  const start = () => {
    if (!hoverCapable || reduceMotion || slides.length <= 1) return
    if (delayRef.current) return // already queued
    activeRef.current = true

    const firstIdx = Math.min(1, slides.length - 1) // skip cover initially

    delayRef.current = window.setTimeout(async () => {
      if (!activeRef.current) return
      idxRef.current = firstIdx

      // Gate the first fade on decode of slides[firstIdx]
      await decodeImage(slides[firstIdx])

      // Put first slide into A, keep hidden, then flip visible after commit
      setASrc(slides[firstIdx])
      setFrontIsA(false)
      frontRef.current = false

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!activeRef.current) return
          setPlaying(true) // fades cover out
          setFrontIsA(true) // fades A in
          frontRef.current = true

          // Preload next (can be cover if wrapping)
          if (slides.length > 1) {
            const pre = new Image()
            pre.src = slides[(firstIdx + 1) % slides.length]
          }

          scheduleNext()
        })
      })
    }, delayMs)
  }

  startRef.current = start

  useEffect(() => stop, []) // cleanup on unmount
  useEffect(() => stop, [cover, images]) // reset when data changes
  useEffect(() => {
    if (playSignal > 0) {
      startRef.current()
    }
  }, [playSignal])

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      {/* Base cover image */}
      <img
        src={cover}
        srcSet={generateSrcSet(cover)}
        sizes={imageSizes}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        referrerPolicy="no-referrer"
        onLoad={onCoverLoad}
        onError={onCoverLoad}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit,
          transition: reduceMotion ? 'none' : `opacity ${fadeMs}ms ease-in`,
          opacity: playing ? 0 : 1,
        }}
        className={cn(aspectClassName, imageClassName)}
      />

      {/* Overlay A */}
      {aSrc && (
        <img
          src={aSrc}
          srcSet={generateSrcSet(aSrc)}
          sizes={imageSizes}
          aria-hidden="true"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            opacity: playing && frontIsA ? 1 : 0,
            transition: reduceMotion ? 'none' : `opacity ${fadeMs}ms ease-in`,
            willChange: 'opacity',
          }}
          className={cn(aspectClassName, imageClassName)}
        />
      )}

      {/* Overlay B */}
      {bSrc && (
        <img
          src={bSrc}
          srcSet={generateSrcSet(bSrc)}
          sizes={imageSizes}
          aria-hidden="true"
          decoding="async"
          draggable={false}
          referrerPolicy="no-referrer"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            opacity: playing && !frontIsA ? 1 : 0,
            transition: reduceMotion ? 'none' : `opacity ${fadeMs}ms ease-in`,
            willChange: 'opacity',
          }}
          className={cn(aspectClassName, imageClassName)}
        />
      )}
    </div>
  )
}
