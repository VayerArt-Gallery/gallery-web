import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { PortableText } from '@portabletext/react'

import SocialMedia from '@/components/SocialMedia'
import { seo } from '@/lib/seo'
import { getAbout } from '@/queries/sanity/about'

const aboutQueryOptions = queryOptions({
  queryKey: ['about'],
  queryFn: getAbout,
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
})

export const Route = createFileRoute('/_pathlessLayout/about/')({
  head: () => ({
    meta: [
      ...seo({
        title: 'About VayerArt Gallery',
        description:
          'Learn about VayerArt Gallery’s commitment to contemporary art, our roots, and how we support artists and collectors.',
      }),
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(aboutQueryOptions),
  component: AboutPage,
})

function AboutPage() {
  const aboutQuery = useSuspenseQuery(aboutQueryOptions)
  const data = aboutQuery.isSuccess ? aboutQuery.data : null

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const google =
    'https://www.google.com/maps?q=34.142514825818,-118.25037743196647'
  const apple = 'maps://maps.apple.com/?q=34.142514825818,-118.25037743196647'

  const href = isIOS ? apple : google

  return (
    <main className="page-main">
      <div className="mb-12">
        <h2 className="page-headline">About VayerArt Gallery</h2>

        <section className="flex flex-col gap-4 md:flex-row">
          {data && (
            <article className="tracking-wide text-pretty">
              <div className="w-full max-w-250 md:w-4/5">
                <PortableText
                  value={data.body}
                  components={{
                    block: {
                      normal: ({ children }) => (
                        <p className="mb-4">{children}</p>
                      ),
                    },
                  }}
                />
              </div>
            </article>
          )}

          <div className="flex w-full flex-col items-stretch gap-6">
            <a href={href} className="w-full max-w-150">
              <img src="gallery-location.webp" className="size-full" />
            </a>

            <div className="flex max-w-150 flex-col items-start justify-between gap-8 lg:flex-row">
              <section>
                <h3 className="mb-2 text-lg font-semibold">Contact</h3>
                {/* <p className="mt-2 text-sm">
                  418 E Colorado Blvd, Glendale, CA 91205
                </p> */}
                <a
                  href="mailto:support@vayerartgallery.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent mt-1 text-sm transition-colors"
                >
                  support@vayerartgallery.com
                </a>
                <p className="mt-0.5 text-sm">+1 (818) 770-4643</p>
              </section>

              <section>
                <h3 className="mb-2 text-lg font-semibold">Social Media</h3>
                <SocialMedia displayStyle="flex" />
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
