import type { Article } from '@/types/blog'

import { sanityClient } from '@/lib/sanity-client'

const allArticlesQuery = `
  *[_type == "magazine"] | order(date desc) {
    "id": _id,
    title,
    subtitle,
    date,
    "slug": slug.current,
    "coverImage": coverImage.asset->url,
    body,
    _updatedAt,
    _createdAt
  }
`

const articleQuery = `
  *[_type == "magazine" && slug.current == $slug][0]{
    "id": _id,
    title,
    subtitle,
    date,
    "slug": slug.current,
    "coverImage": coverImage.asset->url,
    body
  }
`

export async function getAllArticles(): Promise<Article[]> {
  return sanityClient.fetch(allArticlesQuery)
}

export async function getArticle(slug: string): Promise<Article> {
  return sanityClient.fetch(articleQuery, { slug })
}
