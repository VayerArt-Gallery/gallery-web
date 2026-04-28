import { CircleArrowRight, Search } from 'lucide-react'

import { cn } from '@/lib/utils'

import { SEARCH_QUERY_MAX_LENGTH } from './searchPageState'

type SearchFormProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputId?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
  inputClassName?: string
  buttonClassName?: string
}

export default function SearchForm({
  value,
  onChange,
  onSubmit,
  inputId,
  placeholder = 'Search artworks, artists, exhibitions, fairs...',
  autoFocus = false,
  className,
  inputClassName,
  buttonClassName,
}: SearchFormProps) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div
        className={cn(
          'flex items-center rounded-md bg-white text-neutral-900',
          inputClassName,
        )}
      >
        <Search className="pointer-events-none ml-1 size-4.5 shrink-0 text-neutral-400" />
        <input
          id={inputId}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) =>
            onChange(event.target.value.slice(0, SEARCH_QUERY_MAX_LENGTH))
          }
          aria-label="Search query"
          enterKeyHint="search"
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-base leading-none text-inherit placeholder:text-neutral-400 focus:ring-0 focus:outline-none"
          autoFocus={autoFocus}
        />
        <button
          type="submit"
          aria-label="Submit search"
          className={cn(
            'mr-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors duration-200 ease-in-out hover:text-black focus:outline-none',
            buttonClassName,
          )}
        >
          <CircleArrowRight className="size-6.5" strokeWidth={1.5} />
        </button>
      </div>
    </form>
  )
}
