export const seo = ({
  title,
  description,
  keywords,
  image,
  type = 'website',
}: {
  title: string
  description?: string
  image?: string | null
  keywords?: string
  type?: string
}) => {
  const tags = [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'og:type', content: type },
    { name: 'og:title', content: title },
    { name: 'og:description', content: description },
    ...(image ? [{ name: 'og:image', content: image }] : []),
  ]

  return tags
}
