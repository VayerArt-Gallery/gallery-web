import { LOGO_URL, SITE_URL } from './site-config'

export const seo = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  type = 'website',
}: {
  title: string
  description?: string
  image?: string | null
  imageAlt?: string
  keywords?: string
  type?: string
}) => {
  // Fall back to the brand logo so social cards always have an image.
  const shareImage = image ?? LOGO_URL

  const tags = [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'og:type', content: type },
    { name: 'og:title', content: title },
    { name: 'og:description', content: description },
    { name: 'og:image', content: shareImage },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: shareImage },
    { name: 'twitter:image:alt', content: imageAlt ?? title },
  ]

  return tags
}

/**
 * Self-referencing canonical + `en-US` hreflang for a given path.
 * Spread into a route's `head().links`. Keeps each indexable URL canonical to
 * itself (pass the path including any meaningful query string).
 */
export function canonicalLinks(path: string) {
  const href = `${SITE_URL}${path}`

  return [
    { rel: 'canonical', href },
    { rel: 'alternate', href, hrefLang: 'en-US' },
  ]
}
