import type { QueryClient } from '@tanstack/react-query'

import { useEffect } from 'react'

import { TanstackDevtools } from '@tanstack/react-devtools'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import appCss from '../styles.css?url'

import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { seo } from '@/lib/seo'
import {
  loadShopifyPrivacyBanner,
  resolveStorefrontRootDomain,
} from '@/lib/shopify-privacy'
import { cn } from '@/lib/utils'

interface MyRouterContext {
  queryClient: QueryClient
}

const ANALYTICS_ID = 'G-4W8RZMMGH6'

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'google-site-verification',
        content: 'jXJFcyM1wschu2ZQyRB4vEYYlMMsJiRKdJyrQf6TwKQ',
      },
      { name: 'DC.title', content: 'VayerArt Gallery' },
      { name: 'geo.region', content: 'US-CA' },
      { name: 'geo.placename', content: 'Granada Hills' },
      { name: 'geo.position', content: '34.292541;-118.509436' },
      { name: 'ICBM', content: '34.292541, -118.509436' },
      ...seo({
        title: 'VayerArt Gallery | Discover Contemporary Art',
        description:
          'VayerArt Gallery is a contemporary art gallery in Los Angeles, California showcasing curated exhibitions, artists, and collectible works.',
      }),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })

  const isBlogRoute = pathname.startsWith('/blog')

  useEffect(() => {
    const cancelAnalytics = scheduleAfterLoad(() => {
      loadAnalytics(ANALYTICS_ID)
    })

    return cancelAnalytics
  }, [])

  useEffect(() => {
    const SF_API_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_PUBLIC_TOKEN
    const CHECKOUT_DOMAIN = import.meta.env.VITE_SHOPIFY_CHECKOUT_DOMAIN
    const BASE_URL = import.meta.env.VITE_BASE_URL

    if (!SF_API_TOKEN || !CHECKOUT_DOMAIN) return

    return scheduleAfterLoad(() => {
      const storefrontRootDomain = resolveStorefrontRootDomain(
        BASE_URL,
        window.location.hostname,
      )
      const locale = document.documentElement.lang || undefined

      void loadShopifyPrivacyBanner({
        storefrontAccessToken: SF_API_TOKEN,
        checkoutRootDomain: CHECKOUT_DOMAIN,
        storefrontRootDomain,
        locale,
      }).catch((error) => {
        console.warn('Failed to load Shopify privacy banner', error)
      })
    })
  }, [])

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body
        className={cn(
          'mx-3 flex min-h-screen flex-col transition-colors duration-200 ease-in-out md:mx-10',
          isBlogRoute ? 'bg-black text-white' : 'bg-white text-black',
        )}
      >
        <Header />
        <div className="mx-auto flex w-full flex-1 flex-col items-center pt-(--header-height)">
          {children}
          <Footer />
        </div>

        <Scripts />

        {import.meta.env.DEV && <Devtools />}
      </body>
    </html>
  )
}

function Devtools() {
  return (
    <TanstackDevtools
      config={{
        position: 'bottom-left',
      }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        TanStackQueryDevtools,
      ]}
    />
  )
}

function scheduleAfterLoad(task: () => void) {
  const win = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }

  let timeoutId: number | null = null
  let idleId: number | null = null

  const run = () => {
    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(task, { timeout: 2000 })
      return
    }

    timeoutId = window.setTimeout(task, 1200)
  }

  if (document.readyState === 'complete') {
    run()
  } else {
    window.addEventListener('load', run, { once: true })
  }

  return () => {
    window.removeEventListener('load', run)

    if (idleId !== null && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(idleId)
    }

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }
  }
}

function loadAnalytics(analyticsId: string) {
  const existing = document.getElementById('gtag-script')
  if (existing) return

  const win = window as Window & {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }

  win.dataLayer = win.dataLayer ?? []
  win.gtag =
    win.gtag ??
    function gtag(...args: unknown[]) {
      win.dataLayer?.push(args)
    }

  win.gtag('js', new Date())
  win.gtag('config', analyticsId)

  const script = document.createElement('script')
  script.id = 'gtag-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`
  document.head.appendChild(script)
}
