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
  sizes: number[] = [320, 480, 640, 960, 1280],
): string {
  return sizes
    .map((size) => `${transformSanityImage(url, size)} ${size}w`)
    .join(', ')
}

/**
 * Get optimal sizes attribute for image based on display context
 */
export const SANITY_IMAGE_SIZES = {
  // Account for 2x retina displays
  grid: '(min-width: 1536px) 280px, (min-width: 1280px) 250px, (min-width: 1024px) 230px, (min-width: 768px) 320px, 90vw',
  // Detail page
  detail: '(min-width: 1024px) 50vw, 100vw',
  // Full width
  full: '100vw',
} as const
