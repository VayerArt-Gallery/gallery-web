import type { UseSearchLogicReturn } from '../../hooks/useSearch'

import { useEffect, useState } from 'react'

import { Search, X } from 'lucide-react'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

import SearchContent from './SearchContent'

type SearchMobileDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchLogic: UseSearchLogicReturn
  onLinkClick: () => void
  isBlogRoute: boolean
}

export default function SearchMobileDrawer({
  open,
  onOpenChange,
  searchLogic,
  onLinkClick,
  isBlogRoute,
}: SearchMobileDrawerProps) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    const viewport = window.visualViewport
    if (!viewport) return

    // Initialize with current visual viewport height
    setViewportHeight(viewport.height)

    // Update on viewport change (keyboard appears/disappears)
    const handleViewportChange = () => {
      setViewportHeight(window.visualViewport?.height ?? null)
    }

    viewport.addEventListener('resize', handleViewportChange)
    return () => {
      viewport.removeEventListener('resize', handleViewportChange)
    }
  }, [open])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <button className="cursor-pointer p-2 transition-colors duration-200 focus:outline-none">
          <Search className="w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          'flex flex-col',
          isBlogRoute ? 'bg-black text-white' : 'bg-white text-black',
        )}
        style={
          viewportHeight
            ? { height: `${Math.min(viewportHeight * 0.9, viewportHeight)}px` }
            : { height: '90dvh' }
        }
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle
            className={isBlogRoute ? 'text-white' : 'text-black'}
          >
            Search
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Search for artworks, artists, exhibitions, and fairs
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <SearchContent
            searchTerm={searchLogic.searchTerm}
            onSearchChange={searchLogic.setSearchTerm}
            sanityResults={searchLogic.sanityResults}
            shopifyResults={searchLogic.shopifyResults}
            isLoading={searchLogic.isLoading}
            debouncedSearch={searchLogic.debouncedSearch}
            onLinkClick={onLinkClick}
            isDesktop={false}
          />
        </div>

        <DrawerClose asChild>
          <button
            className={cn(
              'absolute top-4 right-4 p-2 transition-colors',
              isBlogRoute
                ? 'text-white hover:bg-white/10'
                : 'text-black hover:bg-black/10',
            )}
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}
