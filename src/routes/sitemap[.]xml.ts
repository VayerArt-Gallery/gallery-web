import { createFileRoute } from '@tanstack/react-router'

import type { SitemapProduct } from '@/queries/graphql/sitemap-fetcher'

import { fetchAllSitemapProducts } from '@/queries/graphql/sitemap-fetcher'
import { getAllArtists } from '@/queries/sanity/artists'
import { getAllExhibitions, getAllFairs } from '@/queries/sanity/events'
import { getAllArticles } from '@/queries/sanity/blog'
import { getAllPages } from '@/queries/sanity/pages'

const BASE_URL = 'https://vayerartgallery.com'

// Helper function to build absolute URLs
function buildUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// Helper function to format dates to ISO 8601 (YYYY-MM-DD)
function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return new Date().toISOString().split('T')[0]
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Interface for sitemap URL entry
interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

// Generate XML for a single URL
function generateUrlXml(url: SitemapUrl): string {
  return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
}

// Generate complete sitemap XML
function generateSitemap(urls: SitemapUrl[]): string {
  const urlsXml = urls.map(generateUrlXml).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`
}

// Fetch all data and build sitemap URLs
async function buildSitemapUrls(): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = []
  const today = formatDate(new Date())

  // Fetch all data in parallel using Promise.allSettled for resilience
  const [productsResult, artistsResult, exhibitionsResult, fairsResult, articlesResult, pagesResult] =
    await Promise.allSettled([
      fetchAllSitemapProducts(),
      getAllArtists(),
      getAllExhibitions(),
      getAllFairs(),
      getAllArticles(),
      getAllPages(),
    ])

  // Static routes
  urls.push({
    loc: buildUrl('/'),
    lastmod: today,
    changefreq: 'daily',
    priority: '1.0',
  })

  urls.push({
    loc: buildUrl('/about'),
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.5',
  })

  urls.push({
    loc: buildUrl('/artists'),
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  })

  urls.push({
    loc: buildUrl('/events'),
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  })

  urls.push({
    loc: buildUrl('/blog'),
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  })

  urls.push({
    loc: buildUrl('/artworks'),
    lastmod: today,
    changefreq: 'daily',
    priority: '0.8',
  })

  // Product URLs
  if (productsResult.status === 'fulfilled') {
    const products = productsResult.value
    products.forEach((product: SitemapProduct) => {
      urls.push({
        loc: buildUrl(`/artworks/${product.handle}`),
        lastmod: formatDate(product.createdAt),
        changefreq: 'weekly',
        priority: '0.9',
      })
    })
  } else {
    console.error('Failed to fetch products for sitemap:', productsResult.reason)
  }

  // Artist URLs
  if (artistsResult.status === 'fulfilled') {
    const artists = artistsResult.value
    artists.forEach((artist: any) => {
      urls.push({
        loc: buildUrl(`/artists/${artist.slug}`),
        lastmod: formatDate(artist._updatedAt || artist._createdAt),
        changefreq: 'monthly',
        priority: '0.8',
      })
    })
  } else {
    console.error('Failed to fetch artists for sitemap:', artistsResult.reason)
  }

  // Exhibition URLs
  if (exhibitionsResult.status === 'fulfilled') {
    const exhibitions = exhibitionsResult.value
    exhibitions.forEach((exhibition: any) => {
      urls.push({
        loc: buildUrl(`/events/exhibitions/${exhibition.slug}`),
        lastmod: formatDate(exhibition._updatedAt || exhibition.startDate || exhibition._createdAt),
        changefreq: 'monthly',
        priority: '0.7',
      })
    })
  } else {
    console.error('Failed to fetch exhibitions for sitemap:', exhibitionsResult.reason)
  }

  // Fair URLs
  if (fairsResult.status === 'fulfilled') {
    const fairs = fairsResult.value
    fairs.forEach((fair: any) => {
      urls.push({
        loc: buildUrl(`/events/fairs/${fair.slug}`),
        lastmod: formatDate(fair._updatedAt || fair.startDate || fair._createdAt),
        changefreq: 'monthly',
        priority: '0.7',
      })
    })
  } else {
    console.error('Failed to fetch fairs for sitemap:', fairsResult.reason)
  }

  // Article URLs
  if (articlesResult.status === 'fulfilled') {
    const articles = articlesResult.value
    articles.forEach((article: any) => {
      urls.push({
        loc: buildUrl(`/blog/${article.slug}`),
        lastmod: formatDate(article.date || article._updatedAt || article._createdAt),
        changefreq: 'monthly',
        priority: '0.6',
      })
    })
  } else {
    console.error('Failed to fetch articles for sitemap:', articlesResult.reason)
  }

  // Legal page URLs
  if (pagesResult.status === 'fulfilled') {
    const pages = pagesResult.value
    pages.forEach((page: any) => {
      urls.push({
        loc: buildUrl(`/legal/${page.slug}`),
        lastmod: formatDate(page.lastUpdated || page._updatedAt || page._createdAt),
        changefreq: 'yearly',
        priority: '0.3',
      })
    })
  } else {
    console.error('Failed to fetch pages for sitemap:', pagesResult.reason)
  }

  return urls
}

// Route handler
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Build all sitemap URLs
          const urls = await buildSitemapUrls()

          // Generate XML
          const xml = generateSitemap(urls)

          // Return with aggressive caching headers
          return new Response(xml, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              // Cache at Cloudflare edge for 12 hours (43200 seconds)
              // Serve stale for 24 hours while revalidating in background
              'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (error) {
          console.error('Error generating sitemap:', error)

          // Return minimal sitemap with static routes on error
          const fallbackUrls: SitemapUrl[] = [
            {
              loc: buildUrl('/'),
              lastmod: formatDate(new Date()),
              changefreq: 'daily',
              priority: '1.0',
            },
            {
              loc: buildUrl('/about'),
              lastmod: formatDate(new Date()),
              changefreq: 'monthly',
              priority: '0.5',
            },
            {
              loc: buildUrl('/artists'),
              lastmod: formatDate(new Date()),
              changefreq: 'daily',
              priority: '0.8',
            },
            {
              loc: buildUrl('/events'),
              lastmod: formatDate(new Date()),
              changefreq: 'daily',
              priority: '0.8',
            },
            {
              loc: buildUrl('/blog'),
              lastmod: formatDate(new Date()),
              changefreq: 'daily',
              priority: '0.8',
            },
            {
              loc: buildUrl('/artworks'),
              lastmod: formatDate(new Date()),
              changefreq: 'daily',
              priority: '0.8',
            },
          ]

          const fallbackXml = generateSitemap(fallbackUrls)

          return new Response(fallbackXml, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        }
      },
    },
  },
})
