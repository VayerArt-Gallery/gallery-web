type ProductNode = {
  id: string
  handle: string
  dimensionsUS: {
    id: string
    value: string
  } | null
  orientation: {
    id: string
    value: string
  } | null
}

type ProductsPageResponse = {
  products: {
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
    edges: Array<{
      node: ProductNode
    }>
  }
}

type MetafieldsSetResponse = {
  metafieldsSet: {
    metafields: Array<{
      id: string
      key: string
      namespace: string
      value: string
    }>
    userErrors: Array<{
      field: string[] | null
      message: string
      code: string | null
    }>
  }
}

type Orientation = 'Horizontal' | 'Vertical' | 'Square'

const PRODUCTS_QUERY = `
  query OrientationProductsPage($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          dimensionsUS: metafield(namespace: "custom", key: "dimensions_us") {
            id
            value
          }
          orientation: metafield(namespace: "custom", key: "orientation") {
            id
            value
          }
        }
      }
    }
  }
`

const METAFIELDS_SET_MUTATION = `
  mutation SetOrientationMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const PAGE_SIZE = 250
const MAX_METAFIELDS_SET_INPUT = 25

type CliConfig = {
  apply: boolean
  overwrite: boolean
  limit?: number
}

function parseArgs(argv: string[]): CliConfig {
  const apply = argv.includes('--apply')
  const overwrite = argv.includes('--overwrite')

  const limitArg = argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined
  const safeLimit = Number.isFinite(limit) && (limit as number) > 0
    ? Math.floor(limit as number)
    : undefined

  return {
    apply,
    overwrite,
    limit: safeLimit,
  }
}

function normalizeAdminDomain(input: string): string {
  const withoutProtocol = input.replace(/^https?:\/\//, '')
  return withoutProtocol.replace(/\/+$/, '')
}

async function adminGraphQL<TData, TVariables extends Record<string, unknown>>(
  endpoint: string,
  accessToken: string,
  query: string,
  variables: TVariables,
): Promise<TData> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Admin API HTTP ${response.status}: ${text}`)
  }

  const payload = (await response.json()) as {
    data?: TData
    errors?: Array<{ message: string }>
  }

  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors.map((e) => e.message).join('; ')
    throw new Error(`Admin API GraphQL error: ${message}`)
  }

  if (!payload.data) {
    throw new Error('Admin API returned no data')
  }

  return payload.data
}

function parseFirstTwoDimensions(dimensionsUS: string): {
  first: number
  second: number
} | null {
  const matches = dimensionsUS.match(/-?\d+(?:\.\d+)?/g)
  if (!matches || matches.length < 2) return null

  const first = Number(matches[0])
  const second = Number(matches[1])
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null

  return { first, second }
}

function inferOrientation(dimensionsUS: string): Orientation | null {
  const parsed = parseFirstTwoDimensions(dimensionsUS)
  if (!parsed) return null

  const diff = Math.abs(parsed.first - parsed.second)
  if (diff <= 1) return 'Square'
  if (parsed.first > parsed.second) return 'Vertical'
  return 'Horizontal'
}

function orientationEquals(
  current: string | undefined,
  next: Orientation,
): boolean {
  return (current ?? '').trim().toLocaleLowerCase('en-US') ===
    next.toLocaleLowerCase('en-US')
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function loadAllProducts(
  endpoint: string,
  accessToken: string,
  limit?: number,
): Promise<ProductNode[]> {
  const out: ProductNode[] = []
  let hasNextPage = true
  let after: string | null = null

  while (hasNextPage) {
    const data = await adminGraphQL<ProductsPageResponse, {
      first: number
      after: string | null
    }>(endpoint, accessToken, PRODUCTS_QUERY, {
      first: PAGE_SIZE,
      after,
    })

    const nodes = data.products.edges.map((edge) => edge.node)
    out.push(...nodes)

    if (limit && out.length >= limit) {
      return out.slice(0, limit)
    }

    hasNextPage = data.products.pageInfo.hasNextPage
    after = data.products.pageInfo.endCursor
  }

  return out
}

async function main() {
  const config = parseArgs(process.argv.slice(2))

  const shopDomainRaw = process.env.SHOPIFY_ADMIN_DOMAIN ??
    process.env.VITE_SHOPIFY_DOMAIN
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  const apiVersion = process.env.SHOPIFY_API_VERSION ?? '2026-01'

  if (!shopDomainRaw) {
    throw new Error(
      'Missing SHOPIFY_ADMIN_DOMAIN (or VITE_SHOPIFY_DOMAIN) environment variable.',
    )
  }
  if (!accessToken) {
    throw new Error('Missing SHOPIFY_ADMIN_ACCESS_TOKEN environment variable.')
  }

  const shopDomain = normalizeAdminDomain(shopDomainRaw)
  const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`

  console.log(`Mode: ${config.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Overwrite existing orientation: ${config.overwrite ? 'yes' : 'no'}`)
  if (config.limit) {
    console.log(`Product limit: ${config.limit}`)
  }
  console.log(`Admin endpoint: ${endpoint}`)

  const products = await loadAllProducts(endpoint, accessToken, config.limit)
  console.log(`Loaded ${products.length} products`)

  const updates: Array<{
    ownerId: string
    handle: string
    currentOrientation: string
    nextOrientation: Orientation
    dimensionsUS: string
  }> = []

  let skippedNoDimensions = 0
  let skippedParseFailed = 0
  let skippedAlreadySet = 0
  let skippedAlreadyCorrect = 0

  for (const product of products) {
    const dimensionsUS = (product.dimensionsUS?.value ?? '').trim()
    const currentOrientation = (product.orientation?.value ?? '').trim()

    if (!dimensionsUS) {
      skippedNoDimensions += 1
      continue
    }

    const inferred = inferOrientation(dimensionsUS)
    if (!inferred) {
      skippedParseFailed += 1
      continue
    }

    if (!config.overwrite && currentOrientation !== '') {
      skippedAlreadySet += 1
      continue
    }

    if (orientationEquals(currentOrientation, inferred)) {
      skippedAlreadyCorrect += 1
      continue
    }

    updates.push({
      ownerId: product.id,
      handle: product.handle,
      currentOrientation,
      nextOrientation: inferred,
      dimensionsUS,
    })
  }

  console.log(`Will update ${updates.length} products`)
  console.log(
    `Skipped: no-dimensions=${skippedNoDimensions}, parse-failed=${skippedParseFailed}, already-set=${skippedAlreadySet}, already-correct=${skippedAlreadyCorrect}`,
  )

  if (updates.length > 0) {
    console.log('Sample updates:')
    updates.slice(0, 15).forEach((u) => {
      const prev = u.currentOrientation || '(empty)'
      console.log(
        `- ${u.handle}: ${prev} -> ${u.nextOrientation} [${u.dimensionsUS}]`,
      )
    })
  }

  if (!config.apply) {
    console.log('Dry-run complete. Re-run with --apply to write changes.')
    return
  }

  let successCount = 0
  let failureCount = 0

  const batches = chunk(updates, MAX_METAFIELDS_SET_INPUT)
  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i]
    const metafields = batch.map((item) => ({
      ownerId: item.ownerId,
      namespace: 'custom',
      key: 'orientation',
      type: 'single_line_text_field',
      value: item.nextOrientation,
    }))

    const res = await adminGraphQL<MetafieldsSetResponse, {
      metafields: Array<{
        ownerId: string
        namespace: string
        key: string
        type: string
        value: string
      }>
    }>(endpoint, accessToken, METAFIELDS_SET_MUTATION, {
      metafields,
    })

    if (res.metafieldsSet.userErrors.length > 0) {
      failureCount += batch.length
      console.error(
        `Batch ${i + 1}/${batches.length} failed with userErrors:`,
        res.metafieldsSet.userErrors,
      )
      continue
    }

    successCount += batch.length
    console.log(`Batch ${i + 1}/${batches.length} updated ${batch.length}`)
  }

  console.log(`Apply complete. Success=${successCount}, Failed=${failureCount}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
