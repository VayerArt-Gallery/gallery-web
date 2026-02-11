export type Article = {
  id: string
  title: string
  // Issue with PortableTextBlock[] type in route loader
  subtitle: any[]
  date: string
  slug: string
  coverImage: string
  // Issue with PortableTextBlock[] type in route loader
  body: any[]
}
