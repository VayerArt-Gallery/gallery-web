type HeroVideoProps = {
  posterSrc: string
  videoSrc: string
  fallbackSrc?: string
}

/**
 *
 * @description
 * A background video intended for the hero section of a page.
 */
export default function HeroVideo({ posterSrc, videoSrc }: HeroVideoProps) {
  return (
    <section className="relative -z-50 -mx-3 -mt-(--header-height) h-[85vh] overflow-hidden md:-mx-10 md:h-[90vh]">
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterSrc}
        tabIndex={-1}
        className="size-full object-cover"
      >
        <source src={videoSrc} type="video/webm" />
      </video>
      <div className="pointer-events-none absolute inset-0 h-full bg-linear-to-b from-black/50 via-black/20 to-transparent" />
    </section>
  )
}
