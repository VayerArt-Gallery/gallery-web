import { useLayoutEffect, useRef, useState } from 'react'

import { Link, useLocation } from '@tanstack/react-router'

import Bag from '@/features/bag/Bag'
import SearchDialog from '@/features/search/SearchDialog'
import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const pathname = useLocation({
    select: (location) => location.pathname,
  })

  useLayoutEffect(() => {
    // Force scroll to top on navigation to prevent iOS Safari bug
    // where header appears at wrong position during page transitions
    window.scrollTo(0, 0)

    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = Math.max(0, doc.scrollHeight - window.innerHeight)
      const threshold = scrollable * 0.1
      setScrolled(window.scrollY > threshold)
    }
    const onResize = () => {
      const h = headerRef.current?.getBoundingClientRect().height
      if (typeof h === 'number' && !Number.isNaN(h)) {
        document.documentElement.style.setProperty('--header-height', `${h}px`)
      }
      onScroll()
    }

    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [pathname])

  const navLinks = [
    { title: 'Home', path: '/' },
    { title: 'Artists', path: '/artists' },
    { title: 'Artworks', path: '/artworks' },
    { title: 'Exhibitions & Fairs', path: '/events?filter=current' },
    { title: 'Magazine', path: '/magazine' },
    { title: 'Sold', path: '/sold' },
    { title: 'About', path: '/about' },
  ]

  // When not floating, we want solid header styling immediately (as if scrolled)
  const floatingRoute = pathname === '/'
  const solidMode = !floatingRoute || scrolled || drawerOpen
  const isMagazineRoute = pathname.startsWith('/magazine')
  const logoSrc =
    solidMode && !isMagazineRoute ? '/logo-black.webp' : '/logo-white.webp'

  return (
    <header
      ref={headerRef}
      style={{ position: 'fixed', top: 0 }}
      className={cn(
        'inset-x-0 z-50 w-full px-3 pt-2.5 pb-0 transition-colors duration-200 md:px-10 md:pt-3 md:pb-0 lg:pt-2 lg:pb-0 xl:pb-2',
        isMagazineRoute
          ? 'bg-black text-white'
          : solidMode
            ? 'bg-white text-black'
            : 'bg-transparent text-white',
      )}
    >
      <nav className="mx-auto flex w-full items-center justify-between">
        <Link
          to="/"
          aria-label="Home"
          className="tracking flex flex-col items-start justify-center tracking-tight"
        >
          <img
            src={logoSrc}
            alt="Vayer Art Gallery logo"
            className="w-28 md:w-40 lg:w-36 xl:w-40"
            width="128"
            height="48"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </Link>

        <div className="flex items-center">
          <nav className="hidden lg:flex">
            <ul className="flex flex-col gap-5 tracking-wide lg:flex-row lg:gap-6 xl:gap-10">
              {navLinks.map((navLink) => (
                <li key={navLink.path}>
                  <Link
                    to={navLink.path}
                    className={cn(
                      'relative text-base font-medium transition-all duration-200',
                      'after:absolute after:-bottom-px after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100',
                      isMagazineRoute
                        ? 'after:bg-white'
                        : solidMode
                          ? 'after:bg-black'
                          : 'after:bg-white',
                    )}
                  >
                    {navLink.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mr-4 ml-10 flex gap-4 lg:mr-0 lg:gap-4">
            <SearchDialog isMagazineRoute={isMagazineRoute} />

            <Bag />
          </div>

          <Drawer
            direction="right"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          >
            <DrawerTrigger className="z-40 py-2 pl-2 text-base font-medium lg:hidden">
              Menu
            </DrawerTrigger>
            <DrawerContent
              className={cn(
                'w-full lg:hidden',
                isMagazineRoute ? 'bg-black text-white' : 'bg-white text-black',
              )}
            >
              <DrawerHeader>
                <DrawerTitle
                  className={`mr-auto ${isMagazineRoute ? 'text-white' : 'text-black'}`}
                >
                  Menu
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Navigation menu for mobile devices
                </DrawerDescription>
              </DrawerHeader>

              <div className="mt-2 px-4">
                <nav>
                  <ul>
                    {navLinks.map((navLink) => (
                      <li key={navLink.path} className="mb-5">
                        <DrawerClose asChild>
                          <Link
                            to={navLink.path}
                            className="text-lg font-medium"
                          >
                            {navLink.title}
                          </Link>
                        </DrawerClose>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              <DrawerFooter>
                <DrawerClose className="ml-auto">
                  <Button
                    variant="ghost"
                    className={isMagazineRoute ? 'text-white' : 'text-black'}
                  >
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </header>
  )
}
