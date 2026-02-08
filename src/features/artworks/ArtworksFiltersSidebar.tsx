import type {
  ArtworksFilterOptions,
  ArtworksFilterState,
  ArtworksSortOption,
} from '@/types/filters'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRICE_RANGE_OPTIONS } from '@/lib/artworks/price'
import { slugify, toggleArrayValue } from '@/lib/utils'

type ArtworksFiltersSidebarProps = {
  sortOption: ArtworksSortOption
  onSortChange: (option: ArtworksSortOption) => void
  filters: ArtworksFilterState
  hasActiveFilters: boolean
  showTitleSortOptions?: boolean
  onFiltersChange: (filters: ArtworksFilterState) => void
  availableOptions: ArtworksFilterOptions
  onClearFilters?: () => void
}

const sortOptions: {
  label: string
  value: ArtworksSortOption
  disabledWhenFiltered?: boolean
}[] = [
  { label: 'Default', value: 'default' },
  { label: 'Title (A → Z)', value: 'title-asc', disabledWhenFiltered: true },
  { label: 'Title (Z → A)', value: 'title-desc', disabledWhenFiltered: true },
  { label: 'Price (low → high)', value: 'price-asc' },
  { label: 'Price (high → low)', value: 'price-desc' },
]

type FilterSectionProps = {
  label: string
  name: keyof ArtworksFilterState
  options: string[]
  selected: string[]
  onToggle: (name: keyof ArtworksFilterState, value: string) => void
}

function FilterSection({
  label,
  name,
  options,
  selected,
  onToggle,
}: FilterSectionProps) {
  if (options.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-700">{label}</h3>
      <ul className="space-y-2">
        {options.map((option) => {
          const id = `${name}-${slugify(option)}`
          const isChecked = selected.includes(option)

          return (
            <li key={option} className="flex items-center gap-2">
              <input
                id={id}
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(name, option)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
              />
              <label
                htmlFor={id}
                className="cursor-pointer text-sm text-neutral-700"
              >
                {option}
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

type SingleSelectFilterSectionProps = {
  label: string
  options: Array<{ label: string; value: string }>
  selectedValue: string | null
  onSelect: (value: string) => void
}

function SingleSelectFilterSection({
  label,
  options,
  selectedValue,
  onSelect,
}: SingleSelectFilterSectionProps) {
  if (options.length === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-700">{label}</h3>
      <ul className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedValue === option.value

          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onSelect(option.value)}
                className="flex w-full cursor-pointer items-center gap-2 text-left"
                aria-pressed={isSelected}
              >
                <span
                  className={[
                    'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                    isSelected ? 'border-neutral-900' : 'border-neutral-300',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-neutral-900" />
                  )}
                </span>
                <span className="text-sm text-neutral-700">{option.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function ArtworksFiltersSidebar({
  sortOption,
  onSortChange,
  filters,
  hasActiveFilters,
  showTitleSortOptions = true,
  onFiltersChange,
  availableOptions,
  onClearFilters,
}: ArtworksFiltersSidebarProps) {
  const handleSortChange = (value: string) => {
    onSortChange(value as ArtworksSortOption)
  }

  const handleToggle = (name: keyof ArtworksFilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [name]:
        name === 'priceRanges'
          ? filters.priceRanges[0] === value
            ? []
            : [value]
          : toggleArrayValue(filters[name], value),
    })
  }

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters()
    } else {
      onFiltersChange({
        styles: [],
        categories: [],
        themes: [],
        artists: [],
        orientations: [],
        priceRanges: [],
      })
    }
  }

  const hasAnyActiveFilters =
    filters.artists.length > 0 ||
    filters.categories.length > 0 ||
    filters.styles.length > 0 ||
    filters.themes.length > 0 ||
    filters.orientations.length > 0 ||
    filters.priceRanges.length > 0

  const displayedSortOptions = showTitleSortOptions
    ? sortOptions
    : sortOptions.filter(
        (option) =>
          option.value !== 'title-asc' && option.value !== 'title-desc',
      )

  return (
    <aside className="space-y-6 rounded-lg border border-neutral-200 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">Refine</h2>
          {hasAnyActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm font-medium text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
              type="button"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">
            Sort by
          </label>
          <Select value={sortOption} onValueChange={handleSortChange}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Select a sort option" />
            </SelectTrigger>
            <SelectContent>
              {displayedSortOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={Boolean(
                    hasActiveFilters && option.disabledWhenFiltered,
                  )}
                  className="data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        <SingleSelectFilterSection
          label="Price"
          options={PRICE_RANGE_OPTIONS}
          selectedValue={filters.priceRanges[0] ?? null}
          onSelect={(value) => handleToggle('priceRanges', value)}
        />
        <FilterSection
          label="Orientation"
          name="orientations"
          options={availableOptions.orientations}
          selected={filters.orientations}
          onToggle={handleToggle}
        />
        <FilterSection
          label="Style"
          name="styles"
          options={availableOptions.styles}
          selected={filters.styles}
          onToggle={handleToggle}
        />
        <FilterSection
          label="Category"
          name="categories"
          options={availableOptions.categories}
          selected={filters.categories}
          onToggle={handleToggle}
        />
        <FilterSection
          label="Theme"
          name="themes"
          options={availableOptions.themes}
          selected={filters.themes}
          onToggle={handleToggle}
        />
        <FilterSection
          label="Artist"
          name="artists"
          options={availableOptions.artists}
          selected={filters.artists}
          onToggle={handleToggle}
        />
      </div>
    </aside>
  )
}
