import { Link, useLocation } from '@tanstack/react-router'

import SocialMedia from './SocialMedia'

export default function Footer() {
  const location = useLocation()
  const isBlogRoute = location.pathname.startsWith('/blog')

  const SF_API_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_PUBLIC_TOKEN
  const CHECKOUT_DOMAIN = import.meta.env.VITE_SHOPIFY_CHECKOUT_DOMAIN
  const STOREFRONT_DOMAIN = 'vayerartgallery.com'

  const navLinks = [
    { title: 'Home', path: '/' },
    { title: 'Artists', path: '/artists' },
    { title: 'Artworks', path: '/artworks' },
    { title: 'Exhibitions & Fairs', path: '/events?filter=current' },
    { title: 'Blog', path: '/blog' },
    { title: 'Sold', path: '/sold' },
    { title: 'About', path: '/about' },
  ]

  const footerBgClass = isBlogRoute
    ? 'bg-black text-white'
    : 'bg-neutral-100/60'

  return (
    <footer
      className={`-mx-4 mt-10 min-w-screen p-4 transition-colors duration-200 md:-mx-10 md:p-6 ${footerBgClass}`}
    >
      <div className="mt-5 flex flex-col items-start justify-between gap-6 md:flex-row md:gap-0 lg:mx-32 xl:mx-56">
        <div>
          <h4 className="font-playfair text-2xl font-medium">
            VayerArt Gallery
          </h4>
          {/* <p className="mt-2 text-sm">
            418 E Colorado Blvd, Glendale, CA 91205
          </p> */}
          <a
            href="mailto:support@vayerartgallery.com"
            className="hover:text-accent mt-1 text-sm transition-colors"
          >
            support@vayerartgallery.com
          </a>
          <p className="mt-0.5 text-sm">+1 (818) 770-4643</p>
        </div>

        <section className="flex flex-col gap-3">
          <h5 className="font-lora font-semibold tracking-wide">The Gallery</h5>
          <nav>
            <ul className="space-y-2">
              {navLinks.map((navLink) => (
                <li key={navLink.path} className="text-sm tracking-wide">
                  <Link
                    to={navLink.path}
                    className="hover:text-accent transition-colors"
                  >
                    {navLink.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section className="flex flex-col gap-3">
          <h5 className="font-lora font-semibold tracking-wide">
            Social Media
          </h5>
          <SocialMedia displayStyle="grid" />
        </section>

        <section className="flex flex-col gap-3">
          <h5 className="font-lora font-semibold tracking-wide">Legal</h5>
          <ul className="space-y-2">
            <li className="text-sm tracking-wide">
              <a
                href="/legal/privacy-policy"
                className="hover:text-accent transition-colors"
              >
                Privacy Policy
              </a>
            </li>
            <li className="text-sm tracking-wide">
              <a
                href="/legal/terms-of-service"
                className="hover:text-accent transition-colors"
              >
                Terms of Service
              </a>
            </li>
            <li className="text-sm tracking-wide">
              <button
                className="hover:text-accent transition-colors"
                onClick={() => {
                  if (window.privacyBanner) {
                    window.privacyBanner.showPreferences({
                      storefrontAccessToken: SF_API_TOKEN,
                      checkoutRootDomain: CHECKOUT_DOMAIN,
                      storefrontRootDomain: STOREFRONT_DOMAIN,
                    })
                  }
                }}
              >
                Cookie Preferences
              </button>
            </li>
          </ul>
        </section>
      </div>

      <p className="mt-10 text-center text-sm md:mt-12">
        Copyright © 2026 VayerArt Gallery. All Rights Reserved
      </p>
    </footer>
  )
}
