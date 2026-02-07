import type { Artwork } from '@/types/products'

import { useState } from 'react'

import { toast } from 'sonner'

import { BagIcon } from '@/components/icons/BagIcon'
import { convertProductToBagItem, useBagStore } from '@/store/bag-store'

type AddToBagBtnProps = {
  type: 'solid' | 'minimal'
  product: Artwork
  disabled?: boolean
  isSold?: boolean
}

export default function AddToBagBtn({
  type,
  product,
  disabled = false,
  isSold = false,
}: AddToBagBtnProps) {
  const [isLoading, setIsLoading] = useState(false)

  const items = useBagStore.use.items()
  const addItem = useBagStore.use.addItem()

  const isAlreadyInBag = items.some((bagItem) => bagItem.id === product.gid)
  const isDisabled = disabled || isSold || isAlreadyInBag || isLoading

  const isSolid = type === 'solid'
  const baseClasses = isSolid
    ? 'w-full rounded-full md:w-fit md:px-12 cursor-pointer px-6 py-3 transition-all duration-200 active:scale-[99%]'
    : 'flex w-fit items-center gap-1 duration-100 ease-in outline-none'
  const enabledClasses = isSolid
    ? 'bg-black text-white hover:bg-accent font-medium ease-in-out'
    : 'text-black hover:text-accent cursor-pointer'
  const disabledClasses = isSolid
    ? 'ring ring-gray-300 text-gray-600 !cursor-not-allowed'
    : 'text-gray-400 cursor-default'
  const classes = `${baseClasses} ${isDisabled ? disabledClasses : enabledClasses}`

  const handleAddToBag = () => {
    if (isDisabled) return

    setIsLoading(true)

    try {
      const bagItem = convertProductToBagItem(product)
      const success = addItem(bagItem)

      if (success) {
        toast.success(`"${product.title}" added to bag`, {
          description: product.artist.name
            ? `by ${product.artist.name}`
            : undefined,
          duration: 3000,
        })
      } else {
        toast.info(`"${product.title}" is already in your bag`)
      }
    } catch (error) {
      console.error('Error adding item to bag:', error)
      toast.error('Failed to add item to bag. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  let buttonText = 'Add to bag'
  if (isSold) {
    buttonText = 'Sold'
  } else if (isLoading) {
    buttonText = 'Adding...'
  } else if (isAlreadyInBag) {
    buttonText = 'In bag'
  }

  const iconClasses = isLoading ? 'size-5 animate-pulse' : 'size-5'

  return (
    <button
      className={classes}
      onClick={handleAddToBag}
      disabled={isDisabled}
      aria-label={`Add ${product.title} to shopping bag`}
      type="button"
    >
      {type === 'minimal' && <BagIcon classes={iconClasses} />}
      <span>{buttonText}</span>
    </button>
  )
}
