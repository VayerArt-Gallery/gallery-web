import { useEffect, useRef, useState } from 'react'

import { useLocation, useNavigate } from '@tanstack/react-router'

import { Search } from 'lucide-react'

import { cn } from '@/lib/utils'

import SearchForm from './SearchForm'
import { createSearchPageState } from './searchPageState'

type SearchDialogProps = {
  isBlogRoute: boolean
}

export default function SearchDialog({ isBlogRoute }: SearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const pathname = useLocation({
    select: (location) => location.pathname,
  })

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSubmit = () => {
    const trimmed = searchTerm.trim()
    setOpen(false)

    void navigate({
      to: '/search',
      search: createSearchPageState(trimmed),
    })
  }

  const handleTriggerClick = () => {
    if (pathname === '/search') {
      const searchInput = document.getElementById('search-page-input')
      if (searchInput instanceof HTMLInputElement) {
        searchInput.focus()
        const end = searchInput.value.length
        searchInput.setSelectionRange(end, end)
      }
      setOpen(false)
      return
    }

    setOpen((current) => !current)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Search"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleTriggerClick}
        className="cursor-pointer p-2 transition-colors duration-200 focus:outline-none"
      >
        <Search className="w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Search"
          className={cn(
            'fixed top-[calc(var(--header-height,0px)+0.25rem)] right-3 z-50 w-[min(32rem,calc(100vw-1.5rem))] rounded-2xl border p-1.5 px-2 shadow-sm md:top-[calc(var(--header-height,0px)-1.5rem)] md:right-10',
            isBlogRoute
              ? 'border-white/20 bg-black text-white'
              : 'border-neutral-300 bg-white text-black shadow-neutral-200',
          )}
        >
          <SearchForm
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={handleSubmit}
            autoFocus
            inputClassName={cn(
              isBlogRoute
                ? 'bg-black text-white'
                : 'border-neutral-200 bg-white text-neutral-900',
            )}
            buttonClassName={cn(isBlogRoute && 'hover:text-white')}
          />
        </div>
      )}
    </div>
  )
}
