import type { PortableTextComponents } from '@portabletext/react'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PortableText } from '@portabletext/react'

import { seo } from '@/lib/seo'
import { formatDateLong } from '@/lib/utils'
import { getPage } from '@/queries/sanity/pages'

function createQueryOptions(slug: string) {
  const pageQueryOptions = queryOptions({
    queryKey: [slug],
    queryFn: async () => await getPage(slug),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  return pageQueryOptions
}

export const Route = createFileRoute('/_pathlessLayout/legal/$slug/')({
  loader: ({ context, params }) => {
    const pageQueryOptions = createQueryOptions(params.slug)
    return context.queryClient.ensureQueryData(pageQueryOptions)
  },
  head: ({ loaderData }) => ({
    meta: [
      ...seo({
        title: loaderData ? loaderData.seo.title : '',
        description: loaderData ? loaderData.seo.description : '',
      }),
    ],
  }),
  component: Page,
})

function Page() {
  const params = Route.useParams()
  const pageQueryOptions = createQueryOptions(params.slug)
  const pageQuery = useSuspenseQuery(pageQueryOptions)

  const data = pageQuery.isSuccess ? pageQuery.data : null
  const lastUpdated = data ? formatDateLong(data.lastUpdated) : ''

  return (
    <main className="page-main">
      {data && (
        <>
          <h2 className="page-headline text-center">{data.title}</h2>

          <h3 className="mb-4 text-center text-lg font-medium">
            Last Updated: {lastUpdated}
          </h3>

          <article className="flex justify-center tracking-wide text-pretty">
            <div className="w-full md:w-1/3">
              <PortableText value={data.body} components={components} />
            </div>
          </article>
        </>
      )}
    </main>
  )
}

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => (
      <h1 className="my-4 text-4xl font-bold">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="my-3 text-3xl font-semibold">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="my-2 text-2xl font-semibold">{children}</h3>
    ),
    normal: ({ children }) => <p className="mb-4">{children}</p>,
  },
  marks: {
    linkExternal: ({ value, children }) => {
      const href = value?.url
      const target = value?.newWindow ? '_blank' : undefined
      return (
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="text-accent underline"
        >
          {children}
        </a>
      )
    },
    linkEmail: ({ value, children }) => {
      const href = `mailto:${value?.email}`
      return (
        <a href={href} className="text-accent underline">
          {children}
        </a>
      )
    },
  },
}
