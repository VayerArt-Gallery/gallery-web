import {
  applyDefinitionsBundle,
  createClientFromEnv,
  hasFlag,
  parseFlagValue,
  printPlanSummary,
  readExportBundle,
  resolveOutputPath,
} from './shopify-definitions-lib'

async function main() {
  const argv = process.argv.slice(2)
  const inputPath = resolveOutputPath(parseFlagValue(argv, 'input'))
  const apply = hasFlag(argv, 'apply')
  const allowAppOwned = hasFlag(argv, 'allow-app-owned')

  const client = createClientFromEnv('SHOPIFY_TARGET', false)
  const bundle = await readExportBundle(inputPath)

  console.log(`Target shop: ${client.shopDomain}`)
  console.log(`API version: ${client.apiVersion}`)
  console.log(`Definitions bundle: ${inputPath}`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Allow app-owned definitions: ${allowAppOwned ? 'yes' : 'no'}`)

  const plan = await applyDefinitionsBundle(client, bundle, {
    apply,
    allowAppOwned,
  })

  printPlanSummary(plan)

  if (!apply) {
    console.log('Dry-run complete. Re-run with --apply to make changes.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
