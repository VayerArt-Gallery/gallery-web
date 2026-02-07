import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { formatDateLong } from '@/lib/utils'
import { getAllArticles } from '@/queries/sanity/magazine'

const allArticlesQueryOptions = queryOptions({
  queryKey: ['all-articles'],
  queryFn: () => getAllArticles(),
})

export const Route = createFileRoute('/_pathlessLayout/magazine/')({
  loader: ({ context }) =>
    context.queryClient
      .ensureQueryData(allArticlesQueryOptions)
      .then(() => undefined),
  head: () => ({
    meta: [
      {
        title: 'Magazine',
        description:
          'Read essays, interviews, and stories from VayerArt Gallery highlighting artists, exhibitions, and the contemporary art scene.',
        type: 'article',
      },
    ],
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: articles } = useSuspenseQuery(allArticlesQueryOptions)

  return (
    <main className="page-main">
      <section className="mb-12">
        <h2 className="page-headline">Magazine</h2>
      </section>

      <section className="animate-fade-in">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {articles.map((a) => {
            const date = formatDateLong(a.date)

            return (
              <Link
                key={a.id}
                to="/magazine/$slug"
                params={{ slug: a.slug }}
                className="h-full"
              >
                <article
                  className={
                    'group flex h-full flex-col overflow-hidden rounded border border-neutral-800 bg-neutral-900 transition-colors duration-200 ease-in hover:bg-neutral-800'
                  }
                >
                  <div className="aspect-5/4 w-full bg-neutral-800">
                    <img
                      src={a.coverImage}
                      alt={a.title}
                      loading="lazy"
                      width={1920}
                      height={1536}
                      className="size-full object-cover"
                    />
                  </div>

                  <div className="flex h-full flex-col justify-between p-4">
                    <h3 className="font-medium tracking-tight md:text-lg">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-300">{date}</p>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}
