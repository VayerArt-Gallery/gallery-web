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
import { cn } from '@/lib/utils'

interface Window {
  privacyBanner: string
}

interface MyRouterContext {
  queryClient: QueryClient
}

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
    const SF_API_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_PUBLIC_TOKEN
    const CHECKOUT_DOMAIN = import.meta.env.VITE_SHOPIFY_CHECKOUT_DOMAIN
    const LOCAL_CONSENT_KEY = 'cookie-consent'

    const scriptId = 'shopify-privacy-banner-js'
    if (document.getElementById(scriptId)) return

    const script = document.createElement('script')
    script.id = scriptId
    script.src =
      'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      const cfg = {
        storefrontAccessToken: SF_API_TOKEN,
        checkoutRootDomain: CHECKOUT_DOMAIN,
        storefrontRootDomain: 'vayerartgallery.com',
      }

      const localConsent = localStorage.getItem(LOCAL_CONSENT_KEY)

      if (!localConsent && window.privacyBanner) {
        window.privacyBanner.loadBanner(cfg)
      }

      const rememberConsent = () => {
        // Cookie consent stored as "decline" by default
        localStorage.setItem(LOCAL_CONSENT_KEY, '1')
      }

      document.addEventListener('visitorConsentCollected', rememberConsent)
    }

    return () => {
      document.removeEventListener('visitorConsentCollected', () => {})
    }
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
