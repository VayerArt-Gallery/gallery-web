export type ShopifyPrivacyBannerConfig = {
  storefrontAccessToken: string
  checkoutRootDomain: string
  storefrontRootDomain: string
  locale?: string
  country?: string
}

type ShopifyPrivacyBannerApi = {
  loadBanner: (config: ShopifyPrivacyBannerConfig) => Promise<void>
  showPreferences: (config?: ShopifyPrivacyBannerConfig) => Promise<void>
}

declare global {
  interface Window {
    privacyBanner?: ShopifyPrivacyBannerApi
  }
}

const PRIVACY_BANNER_SCRIPT_ID = 'shopify-privacy-banner-js'
const PRIVACY_BANNER_SCRIPT_SRC =
  'https://cdn.shopify.com/shopifycloud/privacy-banner/storefront-banner.js'
const SCRIPT_STATUS_ATTR = 'data-shopify-privacy-banner-status'

let privacyBannerApiPromise: Promise<ShopifyPrivacyBannerApi> | null = null

function isPrivacyBannerApi(
  value: ShopifyPrivacyBannerApi | undefined,
): value is ShopifyPrivacyBannerApi {
  return Boolean(
    value &&
    typeof value.loadBanner === 'function' &&
    typeof value.showPreferences === 'function',
  )
}

function getPrivacyBannerApi(): ShopifyPrivacyBannerApi {
  const api = window.privacyBanner
  if (!isPrivacyBannerApi(api)) {
    throw new Error('Shopify privacy banner API did not initialize.')
  }
  return api
}

function inferSharedRootDomain(hostname: string): string {
  if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return hostname
  }

  const parts = hostname.split('.').filter(Boolean)
  if (parts.length >= 2) {
    return parts.slice(-2).join('.')
  }

  return hostname
}

function loadPrivacyBannerApi(): Promise<ShopifyPrivacyBannerApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(
      new Error('Shopify privacy banner can only load in the browser.'),
    )
  }

  if (isPrivacyBannerApi(window.privacyBanner)) {
    return Promise.resolve(window.privacyBanner)
  }

  if (privacyBannerApiPromise) {
    return privacyBannerApiPromise
  }

  privacyBannerApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      PRIVACY_BANNER_SCRIPT_ID,
    ) as HTMLScriptElement | null

    const cleanupListeners = (script: HTMLScriptElement) => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }

    const handleLoad = () => {
      try {
        resolve(getPrivacyBannerApi())
      } catch (error) {
        reject(error)
      }
    }

    const handleError = () => {
      reject(
        new Error(
          `Failed loading Shopify privacy banner script: ${PRIVACY_BANNER_SCRIPT_SRC}`,
        ),
      )
    }

    if (existingScript) {
      const status = existingScript.getAttribute(SCRIPT_STATUS_ATTR)

      if (status === 'loaded') {
        try {
          resolve(getPrivacyBannerApi())
        } catch (error) {
          reject(error)
        }
        return
      }

      if (status === 'error') {
        existingScript.remove()
      } else {
        existingScript.addEventListener('load', handleLoad, { once: true })
        existingScript.addEventListener('error', handleError, { once: true })
        return
      }
    }

    const script = document.createElement('script')
    script.id = PRIVACY_BANNER_SCRIPT_ID
    script.src = PRIVACY_BANNER_SCRIPT_SRC
    script.async = true
    script.setAttribute(SCRIPT_STATUS_ATTR, 'loading')
    script.addEventListener(
      'load',
      () => {
        script.setAttribute(SCRIPT_STATUS_ATTR, 'loaded')
        cleanupListeners(script)
        handleLoad()
      },
      { once: true },
    )
    script.addEventListener(
      'error',
      () => {
        script.setAttribute(SCRIPT_STATUS_ATTR, 'error')
        cleanupListeners(script)
        handleError()
      },
      { once: true },
    )
    document.body.appendChild(script)
  }).catch((error) => {
    privacyBannerApiPromise = null
    throw error
  })

  return privacyBannerApiPromise
}

export function resolveStorefrontRootDomain(
  baseUrl: string | undefined,
  currentHostname: string,
): string {
  if (baseUrl) {
    try {
      return inferSharedRootDomain(new URL(baseUrl).hostname)
    } catch {
      // Fall through to hostname-based resolution.
    }
  }

  return inferSharedRootDomain(currentHostname)
}

export async function loadShopifyPrivacyBanner(
  config: ShopifyPrivacyBannerConfig,
) {
  const api = await loadPrivacyBannerApi()
  await api.loadBanner(config)
}

export async function showShopifyPrivacyPreferences(
  config: ShopifyPrivacyBannerConfig,
) {
  const api = await loadPrivacyBannerApi()
  await api.showPreferences(config)
}
