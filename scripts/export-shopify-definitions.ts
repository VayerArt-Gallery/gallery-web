import {
  createClientFromEnv,
  exportDefinitions,
  parseFlagValue,
  resolveOutputPath,
  writeExportBundle,
} from './shopify-definitions-lib'

async function main() {
  const argv = process.argv.slice(2)
  const outputPath = resolveOutputPath(parseFlagValue(argv, 'output'))
  const client = createClientFromEnv('SHOPIFY_SOURCE', true)

  console.log(`Source shop: ${client.shopDomain}`)
  console.log(`API version: ${client.apiVersion}`)
  console.log(`Writing export to: ${outputPath}`)

  const bundle = await exportDefinitions(client)
  await writeExportBundle(outputPath, bundle)

  console.log(
    `Exported ${bundle.metaobjectDefinitions.length} metaobject definitions and ${bundle.metafieldDefinitions.length} metafield definitions.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
