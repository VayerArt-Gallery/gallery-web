// Sanity image URL transformation utilities
// Sanity CDN supports size transformations via URL parameters

/**
 * Transform a Sanity image URL to a specific size
 * @param url - Original Sanity image URL
 * @param width - Desired width in pixels
 * @returns Transformed URL with width parameter
 */
export function transformSanityImage(url: string, width: number): string {
  if (!url) return url

  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set('w', width.toString())
    urlObj.searchParams.set('auto', 'format')
    urlObj.searchParams.set('fit', 'max')
    return urlObj.toString()
  } catch {
    // If URL parsing fails, append query string manually
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}w=${width}&auto=format&fit=max`
  }
}

/**
 * Generate srcset for responsive images from Sanity
 * @param url - Original Sanity image URL
 * @param sizes - Array of desired widths
 * @returns srcset string for responsive images
 */
export function generateSanitySrcSet(
  url: string,
  widths: number[] = SANITY_DETAIL_SRC_SET_WIDTHS,
): string {
  return widths
    .map((width) => `${transformSanityImage(url, width)} ${width}w`)
    .join(', ')
}

/**
 * Generate srcset optimized for grid thumbnails.
 * Widths cover high-DPI displays (4-col featured grid slots).
 */
export function generateSanityGridSrcSet(url: string): string {
  return generateSanitySrcSet(url, SANITY_GRID_SRC_SET_WIDTHS)
}

// Grid thumbnails (4-col featured grid) — sized up for high-DPI displays
export const SANITY_GRID_SRC_SET_WIDTHS = [240, 360, 480, 640, 768]

// Larger 2-up grids (e.g. the artists listing) and detail-page carousels
export const SANITY_DETAIL_SRC_SET_WIDTHS = [480, 640, 768, 960, 1280]

// Full-screen zoom view
export const SANITY_ZOOM_SRC_SET_WIDTHS = [768, 1024, 1536, 2048]

/**
 * Get optimal sizes attribute for image based on display context
 */
export const SANITY_IMAGE_SIZES = {
  // 2 columns on mobile, 4 columns from the md breakpoint up
  grid: '(min-width: 768px) 23vw, 48vw',
  // 2-up grid (artists listing) — large slots at every breakpoint
  splitGrid: '48vw',
  // Detail page carousel (capped at the ~700px container)
  detail: '(min-width: 1024px) 768px, calc(100vw - 2rem)',
  // Full-screen zoom view
  zoom: '(min-width: 1024px) 1024px, 100vw',
  // Full width
  full: '100vw',
} as const
