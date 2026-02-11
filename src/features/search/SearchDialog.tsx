import { useEffect, useState } from 'react'

import { useSearchLogic } from '../../hooks/useSearch'

import { useMediaQuery } from '@/hooks/useMediaQuery'

import SearchDesktopDialog from './SearchDesktopDialog'
import SearchMobileDrawer from './SearchMobileDrawer'

type SearchDialogProps = {
  isBlogRoute: boolean
}

export default function SearchDialog({ isBlogRoute }: SearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const searchLogic = useSearchLogic()

  // Wait until component is mounted before using media query to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLinkClick = () => {
    setOpen(false)
    searchLogic.setSearchTerm('')
  }

  // Return desktop version as default during SSR to avoid hydration mismatch
  // This ensures both server and client start with the same HTML
  if (!mounted) {
    return (
      <SearchDesktopDialog
        open={open}
        onOpenChange={setOpen}
        searchLogic={searchLogic}
        onLinkClick={handleLinkClick}
      />
    )
  }

  if (isDesktop) {
    return (
      <SearchDesktopDialog
        open={open}
        onOpenChange={setOpen}
        searchLogic={searchLogic}
        onLinkClick={handleLinkClick}
      />
    )
  }

  return (
    <SearchMobileDrawer
      open={open}
      onOpenChange={setOpen}
      searchLogic={searchLogic}
      onLinkClick={handleLinkClick}
      isBlogRoute={isBlogRoute}
    />
  )
}
