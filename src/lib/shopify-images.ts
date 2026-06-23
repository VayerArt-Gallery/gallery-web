// Shopify image URL transformation utilities
// Shopify CDN supports size transformations via the `width` query parameter.
//
// Format note: Shopify serves WebP/AVIF automatically via `Accept`-header
// content negotiation, so there is no `format` URL param to set (it is a
// no-op). Modern browsers already receive WebP/AVIF; older ones get JPEG.

/**
 * Transform a Shopify image URL to a specific width.
 * @param url - Original Shopify image URL
 * @param width - Desired width in pixels
 * @returns Transformed URL with width parameter
 */
export function transformShopifyImage(url: string, width: number): string {
  if (!url) return url

  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set('width', width.toString())
    return urlObj.toString()
  } catch {
    // If URL parsing fails, append query string manually
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}width=${width}`
  }
}

/**
 * Generate srcset for responsive images from Shopify
 * @param url - Original Shopify image URL
 * @param widths - Array of desired widths
 * @returns srcset string for responsive images
 */
export function generateShopifySrcSet(
  url: string,
  widths: number[] = PRODUCT_IMAGE_SRC_SET_WIDTHS,
): string {
  return widths
    .map((width) => `${transformShopifyImage(url, width)} ${width}w`)
    .join(', ')
}

/**
 * Generate srcset optimized for grid thumbnails.
 * Widths cover high-DPI displays (2-col mobile / 4-col desktop slots).
 */
export function generateShopifyGridSrcSet(url: string): string {
  return generateShopifySrcSet(url, SHOPIFY_GRID_SRC_SET_WIDTHS)
}

// Grid thumbnails (2-col mobile, 4-col desktop) — sized up for high-DPI displays
export const SHOPIFY_GRID_SRC_SET_WIDTHS = [240, 360, 480, 640, 768]

// Carousel filmstrip thumbnails (~127px slot)
export const SHOPIFY_THUMBNAIL_SRC_SET_WIDTHS = [150, 300]

// Product detail page carousel (capped at the ~700px carousel container)
export const PRODUCT_IMAGE_SRC_SET_WIDTHS = [480, 640, 768, 800, 960]
export const PRODUCT_IMAGE_SIZES =
  '(min-width: 1024px) 768px, calc(100vw - 2rem)'

// Full-screen zoom view
export const ZOOM_PRODUCT_IMAGE_WIDTH = 2048
export const ZOOM_PRODUCT_IMAGE_SRC_SET_WIDTHS = [768, 1024, 1536, 2048]
export const ZOOM_PRODUCT_IMAGE_SIZES = '(min-width: 1024px) 1024px, 100vw'

/**
 * Optimal `sizes` attribute per display context.
 */
export const SHOPIFY_IMAGE_SIZES = {
  // 2 columns on mobile, 4 columns from the md breakpoint up
  grid: '(min-width: 768px) 23vw, 48vw',
  // Detail page carousel
  detail: PRODUCT_IMAGE_SIZES,
  // Filmstrip thumbnails
  thumbnail: '150px',
} as const
