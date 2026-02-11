import type { Article } from '@/types/blog'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PortableText } from '@portabletext/react'

import { formatDateLong } from '@/lib/utils'
import { getArticle } from '@/queries/sanity/blog'

function createArticleQuery(slug: string) {
  return queryOptions({
    queryKey: [`article-${slug}`],
    queryFn: () => getArticle(slug),
  })
}

function generateSeoDescription(article: Article) {
  const publishedOn = formatDateLong(article.date)

  return `${article.title} — published ${publishedOn} by VayerArt Gallery Blog.`
}

export const Route = createFileRoute('/_pathlessLayout/blog/$slug')({
  loader: async ({ context, params }) =>
    context.queryClient.ensureQueryData(createArticleQuery(params.slug)),
  head: ({ loaderData, params }) => {
    const title = loaderData?.title ?? params.slug
    const description = loaderData
      ? generateSeoDescription(loaderData)
      : `Explore ${title} from VayerArt Gallery Blog.`

    return {
      meta: [
        {
          title,
          description,
          image: loaderData?.coverImage ?? null,
          type: 'article',
        },
      ],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { slug } = Route.useParams()
  const articleQuery = createArticleQuery(slug)

  const { data: article } = useSuspenseQuery(articleQuery)

  const date = formatDateLong(article.date)

  return (
    <main className="page-main">
      <article className="mx-auto max-w-3xl">
        {/* Cover Image */}
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg">
          <img
            src={article.coverImage}
            alt={article.title}
            className="size-full object-cover"
          />
        </div>

        {/* Title & Date */}
        <header className="mb-8">
          <h1 className="font-playfair mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            {article.title}
          </h1>

          {article.subtitle.length > 0 && (
            <div className="mb-4 text-lg text-neutral-300">
              <PortableText
                value={article.subtitle}
                components={{
                  block: {
                    normal: ({ children }) => <p>{children}</p>,
                  },
                }}
              />
            </div>
          )}

          <time className="text-sm text-neutral-400">{date}</time>
        </header>

        {/* Article Body */}
        <div className="prose prose-invert prose-lg max-w-none tracking-wide">
          <PortableText
            value={article.body}
            components={{
              block: {
                normal: ({ children }) => (
                  <p className="mb-6 leading-relaxed text-neutral-200">
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h1 className="font-playfair mt-12 mb-6 text-3xl font-bold">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-playfair mt-10 mb-4 text-2xl font-bold">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-8 mb-4 text-xl font-semibold">
                    {children}
                  </h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-4 border-neutral-600 pl-6 text-neutral-300 italic">
                    {children}
                  </blockquote>
                ),
              },
              marks: {
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                link: ({ value, children }) => {
                  const target = value?.href?.startsWith('http')
                    ? '_blank'
                    : undefined
                  return (
                    <a
                      href={value?.href}
                      target={target}
                      rel={
                        target === '_blank' ? 'noopener noreferrer' : undefined
                      }
                      className="text-neutral-100 underline transition-colors hover:text-white"
                    >
                      {children}
                    </a>
                  )
                },
              },
              list: {
                bullet: ({ children }) => (
                  <ul className="my-6 list-disc space-y-2 pl-6 text-neutral-200">
                    {children}
                  </ul>
                ),
                number: ({ children }) => (
                  <ol className="my-6 list-decimal space-y-2 pl-6 text-neutral-200">
                    {children}
                  </ol>
                ),
              },
            }}
          />
        </div>
      </article>
    </main>
  )
}
