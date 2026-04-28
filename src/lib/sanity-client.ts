import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = 'fqlwsw1s'
const dataset = 'vayerart'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
})

const builder = imageUrlBuilder(sanityClient)

// Image helper
export function urlFor(source: any) {
  return builder.image(source)
}
