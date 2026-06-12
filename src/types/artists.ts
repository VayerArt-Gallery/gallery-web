import type { Artwork } from './products'

export type Artist = {
  id: string
  name: string
  slug: string
  artistImage: string
  backgroundImage: string
  tagline: string
  // SEO-only: feeds the Person structured data, not rendered on the page.
  jobTitle?: string
  // Issue with PortableTextBlock[] type in route loader
  bio: any[]
  selectedWorks?: Artwork[]
}
