import 'dotenv/config'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

const DEFAULT_API_VERSION = '2026-04'
const PAGE_SIZE = 250

const INTROSPECT_OWNER_TYPES_QUERY = `
  query MetafieldOwnerTypeEnum {
    __type(name: "MetafieldOwnerType") {
      enumValues(includeDeprecated: true) {
        name
      }
    }
  }
`

const INTROSPECT_OBJECT_FIELDS_QUERY = `
  query IntrospectObjectFields($name: String!) {
    __type(name: $name) {
      fields(includeDeprecated: true) {
        name
      }
    }
  }
`

const INTROSPECT_INPUT_FIELDS_QUERY = `
  query IntrospectInputFields($name: String!) {
    __type(name: $name) {
      inputFields {
        name
      }
    }
  }
`

const METAOBJECT_DEFINITIONS_QUERY = `
  query ExportMetaobjectDefinitions($first: Int!, $after: String) {
    metaobjectDefinitions(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        type
        description
        displayNameKey
        standardTemplate {
          type
        }
        access {
          admin
          storefront
        }
        capabilities {
          publishable {
            enabled
          }
          translatable {
            enabled
          }
          renderable {
            enabled
            data {
              metaTitleKey
              metaDescriptionKey
            }
          }
          onlineStore {
            enabled
          }
        }
        fieldDefinitions {
          key
          name
          description
          required
          type {
            name
          }
          validations {
            name
            type
            value
          }
        }
      }
    }
  }
`

const METAOBJECT_DEFINITIONS_QUERY_WITH_FIELD_CAPABILITIES = `
  query ExportMetaobjectDefinitions($first: Int!, $after: String) {
    metaobjectDefinitions(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        type
        description
        displayNameKey
        standardTemplate {
          type
        }
        access {
          admin
          storefront
        }
        capabilities {
          publishable {
            enabled
          }
          translatable {
            enabled
          }
          renderable {
            enabled
            data {
              metaTitleKey
              metaDescriptionKey
            }
          }
          onlineStore {
            enabled
          }
        }
        fieldDefinitions {
          key
          name
          description
          required
          type {
            name
          }
          validations {
            name
            type
            value
          }
          capabilities {
            adminFilterable {
              enabled
            }
          }
        }
      }
    }
  }
`

const METAFIELD_DEFINITIONS_QUERY = `
  query ExportMetafieldDefinitions(
    $ownerType: MetafieldOwnerType!
    $first: Int!
    $after: String
  ) {
    metafieldDefinitions(
      ownerType: $ownerType
      first: $first
      after: $after
      pinnedStatus: ANY
      constraintStatus: CONSTRAINED_AND_UNCONSTRAINED
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        namespace
        key
        description
        ownerType
        pinnedPosition
        useAsCollectionCondition
        standardTemplate {
          id
          namespace
          key
        }
        type {
          name
          category
        }
        access {
          admin
          storefront
          customerAccount
        }
        capabilities {
          adminFilterable {
            enabled
          }
          smartCollectionCondition {
            enabled
          }
          uniqueValues {
            enabled
          }
        }
        validations {
          name
          type
          value
        }
        constraints {
          key
          values(first: 250) {
            nodes {
              value
            }
          }
        }
      }
    }
  }
`

const METAOBJECT_DEFINITION_CREATE_MUTATION = `
  mutation CreateMetaobjectDefinition(
    $definition: MetaobjectDefinitionCreateInput!
  ) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const METAOBJECT_DEFINITION_UPDATE_MUTATION = `
  mutation UpdateMetaobjectDefinition(
    $id: ID!
    $definition: MetaobjectDefinitionUpdateInput!
  ) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const STANDARD_METAOBJECT_DEFINITION_ENABLE_MUTATION = `
  mutation EnableStandardMetaobjectDefinition($type: String!) {
    standardMetaobjectDefinitionEnable(type: $type) {
      metaobjectDefinition {
        id
        name
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const METAFIELD_DEFINITION_CREATE_MUTATION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        ownerType
        namespace
        key
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const METAFIELD_DEFINITION_UPDATE_MUTATION = `
  mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition {
        id
        ownerType
        namespace
        key
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const STANDARD_METAFIELD_DEFINITION_ENABLE_MUTATION = `
  mutation EnableStandardMetafieldDefinition(
    $ownerType: MetafieldOwnerType!
    $namespace: String
    $key: String
    $access: StandardMetafieldDefinitionAccessInput
    $capabilities: MetafieldCapabilityCreateInput
    $pin: Boolean
  ) {
    standardMetafieldDefinitionEnable(
      ownerType: $ownerType
      namespace: $namespace
      key: $key
      access: $access
      capabilities: $capabilities
      pin: $pin
    ) {
      createdDefinition {
        id
        ownerType
        namespace
        key
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const METAFIELD_DEFINITION_PIN_MUTATION = `
  mutation PinMetafieldDefinition($definitionId: ID!) {
    metafieldDefinitionPin(definitionId: $definitionId) {
      pinnedDefinition {
        id
        ownerType
        namespace
        key
        pinnedPosition
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

const METAFIELD_DEFINITION_UNPIN_MUTATION = `
  mutation UnpinMetafieldDefinition($definitionId: ID!) {
    metafieldDefinitionUnpin(definitionId: $definitionId) {
      unpinnedDefinition {
        id
        ownerType
        namespace
        key
        pinnedPosition
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

type GraphQLError = {
  message: string
}

type UserError = {
  field?: string[] | null
  message: string
  code?: string | null
}

type GraphQLPayload<TData> = {
  data?: TData
  errors?: GraphQLError[]
}

type PageInfo = {
  hasNextPage: boolean
  endCursor: string | null
}

export type ShopifyClient = {
  label: string
  shopDomain: string
  apiVersion: string
  endpoint: string
  accessToken: string
}

type ValidationExport = {
  name: string
  type: string
  value: string | null
}

type ValidationInput = {
  name: string
  value?: string
}

type MetafieldConstraintExport = {
  key: string | null
  values: string[]
}

type MetaobjectFieldCapabilitiesExport = {
  adminFilterable: {
    enabled: boolean
  }
}

type MetaobjectDefinitionCapabilitiesExport = {
  publishable: {
    enabled: boolean
  }
  translatable: {
    enabled: boolean
  }
  renderable: {
    enabled: boolean
    data: {
      metaTitleKey: string | null
      metaDescriptionKey: string | null
    }
  }
  onlineStore: {
    enabled: boolean
  }
}

type MetaobjectFieldDefinitionExport = {
  key: string
  name: string | null
  description: string | null
  required: boolean
  type: string
  validations: ValidationExport[]
  capabilities: MetaobjectFieldCapabilitiesExport
}

export type MetaobjectDefinitionExport = {
  id: string
  name: string | null
  type: string
  description: string | null
  displayNameKey: string | null
  access: {
    admin: string | null
    storefront: string | null
  }
  capabilities: MetaobjectDefinitionCapabilitiesExport
  standardTemplate: {
    type: string
  } | null
  fieldDefinitions: MetaobjectFieldDefinitionExport[]
}

export type MetafieldDefinitionExport = {
  id: string
  ownerType: string
  namespace: string
  key: string
  name: string
  description: string | null
  type: {
    name: string
    category: string | null
  }
  access: {
    admin: string | null
    storefront: string | null
    customerAccount: string | null
  }
  capabilities: {
    adminFilterable: {
      enabled: boolean
    }
    smartCollectionCondition: {
      enabled: boolean
    }
    uniqueValues: {
      enabled: boolean
    }
  }
  validations: ValidationExport[]
  constraints: MetafieldConstraintExport | null
  pinnedPosition: number | null
  useAsCollectionCondition: boolean
  standardTemplate: {
    id: string | null
    namespace: string | null
    key: string | null
  } | null
}

export type DefinitionsExportBundle = {
  exportedAt: string
  apiVersion: string
  sourceShop: string
  ownerTypes: string[]
  metaobjectDefinitions: MetaobjectDefinitionExport[]
  metafieldDefinitions: MetafieldDefinitionExport[]
}

type ExportMetaobjectDefinitionsResponse = {
  metaobjectDefinitions: {
    pageInfo: PageInfo
    nodes: Array<{
      id: string
      name: string | null
      type: string
      description: string | null
      displayNameKey: string | null
      standardTemplate: { type: string } | null
      access: {
        admin: string | null
        storefront: string | null
      }
      capabilities: {
        publishable: { enabled: boolean }
        translatable: { enabled: boolean }
        renderable: {
          enabled: boolean
          data: {
            metaTitleKey: string | null
            metaDescriptionKey: string | null
          } | null
        }
        onlineStore: {
          enabled: boolean
        }
      }
      fieldDefinitions: Array<{
        key: string
        name: string | null
        description: string | null
        required: boolean
        type: { name: string }
        validations: Array<{
          name: string
          type: string
          value: string | null
        }>
        capabilities: {
          adminFilterable: {
            enabled: boolean
          }
        } | null
      }>
    }>
  }
}

type ExportMetafieldDefinitionsResponse = {
  metafieldDefinitions: {
    pageInfo: PageInfo
    nodes: Array<{
      id: string
      name: string
      namespace: string
      key: string
      description: string | null
      ownerType: string
      pinnedPosition: number | null
      useAsCollectionCondition: boolean
      standardTemplate: {
        id: string | null
        namespace: string | null
        key: string | null
      } | null
      type: {
        name: string
        category: string | null
      }
      access: {
        admin: string | null
        storefront: string | null
        customerAccount: string | null
      }
      capabilities: {
        adminFilterable: { enabled: boolean }
        smartCollectionCondition: { enabled: boolean }
        uniqueValues: { enabled: boolean }
      }
      validations: Array<{
        name: string
        type: string
        value: string | null
      }>
      constraints: {
        key: string | null
        values: {
          nodes: Array<{ value: string }>
        }
      } | null
    }>
  }
}

type IntrospectOwnerTypesResponse = {
  __type: {
    enumValues: Array<{ name: string }>
  } | null
}

type IntrospectObjectFieldsResponse = {
  __type: {
    fields: Array<{ name: string }> | null
  } | null
}

type IntrospectInputFieldsResponse = {
  __type: {
    inputFields: Array<{ name: string }> | null
  } | null
}

type DefinitionMutationResult<TField extends string, TNode> = {
  [K in TField]: {
    userErrors: UserError[]
  } & TNode
}

function normalizeAdminDomain(input: string): string {
  const withoutProtocol = input.replace(/^https?:\/\//u, '')
  return withoutProtocol.replace(/\/+$/u, '')
}

function readPrefixedEnv(
  prefix: string,
  suffixes: string[],
  fallbackSuffixes: string[] = [],
): string | undefined {
  for (const suffix of suffixes) {
    const candidate = process.env[`${prefix}_${suffix}`]?.trim()
    if (candidate) return candidate
  }

  for (const suffix of fallbackSuffixes) {
    const candidate = process.env[suffix]?.trim()
    if (candidate) return candidate
  }

  return undefined
}

export function createClientFromEnv(
  prefix: 'SHOPIFY_SOURCE' | 'SHOPIFY_TARGET',
  fallbackToDefault: boolean,
): ShopifyClient {
  const shopDomainRaw = readPrefixedEnv(
    prefix,
    ['ADMIN_DOMAIN', 'STORE_DOMAIN', 'DOMAIN'],
    fallbackToDefault
      ? ['SHOPIFY_ADMIN_DOMAIN', 'SHOPIFY_STORE_DOMAIN', 'VITE_SHOPIFY_DOMAIN']
      : [],
  )
  const accessToken = readPrefixedEnv(
    prefix,
    ['ADMIN_ACCESS_TOKEN', 'ADMIN_API_TOKEN', 'ACCESS_TOKEN'],
    fallbackToDefault
      ? ['SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_ADMIN_API_TOKEN']
      : [],
  )
  const apiVersion =
    readPrefixedEnv(prefix, ['API_VERSION']) ?? DEFAULT_API_VERSION

  if (!shopDomainRaw) {
    throw new Error(
      `Missing ${prefix}_ADMIN_DOMAIN (or ${prefix}_STORE_DOMAIN / ${prefix}_DOMAIN).`,
    )
  }
  if (!accessToken) {
    throw new Error(
      `Missing ${prefix}_ADMIN_ACCESS_TOKEN (or ${prefix}_ADMIN_API_TOKEN / ${prefix}_ACCESS_TOKEN).`,
    )
  }

  const shopDomain = normalizeAdminDomain(shopDomainRaw)

  return {
    label: prefix,
    shopDomain,
    apiVersion,
    accessToken,
    endpoint: `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
  }
}

export async function adminGraphQL<
  TData,
  TVariables extends Record<string, unknown> | undefined,
>(
  client: ShopifyClient,
  query: string,
  variables?: TVariables,
): Promise<TData> {
  const response = await fetch(client.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': client.accessToken,
    },
    body: JSON.stringify({
      query,
      variables: variables ?? {},
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(
      `[${client.label}] Admin API HTTP ${response.status}: ${text}`,
    )
  }

  const payload = (await response.json()) as GraphQLPayload<TData>

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const message = payload.errors.map((error) => error.message).join('; ')
    throw new Error(`[${client.label}] Admin API GraphQL error: ${message}`)
  }

  if (!payload.data) {
    throw new Error(`[${client.label}] Admin API returned no data`)
  }

  return payload.data
}

function formatUserErrors(errors: UserError[]): string {
  return errors
    .map((error) => {
      const field =
        Array.isArray(error.field) && error.field.length > 0
          ? ` [${error.field.join('.')}]`
          : ''
      const code = error.code ? ` (${error.code})` : ''
      return `${error.message}${field}${code}`
    })
    .join('; ')
}

function assertNoUserErrors(
  label: string,
  errors: UserError[],
): asserts errors is [] {
  if (errors.length > 0) {
    throw new Error(`${label}: ${formatUserErrors(errors)}`)
  }
}

export async function discoverMetafieldOwnerTypes(
  client: ShopifyClient,
): Promise<string[]> {
  const data = await adminGraphQL<
    IntrospectOwnerTypesResponse,
    Record<string, never>
  >(client, INTROSPECT_OWNER_TYPES_QUERY, {})

  const ownerTypes = data.__type?.enumValues.map((value) => value.name) ?? []
  if (ownerTypes.length === 0) {
    throw new Error(
      `[${client.label}] Failed to introspect MetafieldOwnerType enum.`,
    )
  }
  return ownerTypes
}

async function objectTypeHasField(
  client: ShopifyClient,
  typeName: string,
  fieldName: string,
): Promise<boolean> {
  const data = await adminGraphQL<
    IntrospectObjectFieldsResponse,
    { name: string }
  >(client, INTROSPECT_OBJECT_FIELDS_QUERY, {
    name: typeName,
  })

  return (
    data.__type?.fields?.some((field) => field.name === fieldName) ?? false
  )
}

async function inputTypeHasField(
  client: ShopifyClient,
  typeName: string,
  fieldName: string,
): Promise<boolean> {
  const data = await adminGraphQL<
    IntrospectInputFieldsResponse,
    { name: string }
  >(client, INTROSPECT_INPUT_FIELDS_QUERY, {
    name: typeName,
  })

  return (
    data.__type?.inputFields?.some((field) => field.name === fieldName) ?? false
  )
}

export async function exportDefinitions(
  client: ShopifyClient,
): Promise<DefinitionsExportBundle> {
  const ownerTypes = await discoverMetafieldOwnerTypes(client)

  const metaobjectDefinitions =
    await loadAllMetaobjectDefinitions(client)
  const metafieldDefinitions =
    await loadAllMetafieldDefinitions(client, ownerTypes)

  return {
    exportedAt: new Date().toISOString(),
    apiVersion: client.apiVersion,
    sourceShop: client.shopDomain,
    ownerTypes,
    metaobjectDefinitions,
    metafieldDefinitions,
  }
}

async function loadAllMetaobjectDefinitions(
  client: ShopifyClient,
): Promise<MetaobjectDefinitionExport[]> {
  const items: MetaobjectDefinitionExport[] = []
  let after: string | null = null
  let hasNextPage = true
  const supportsFieldCapabilities = await objectTypeHasField(
    client,
    'MetaobjectFieldDefinition',
    'capabilities',
  )

  while (hasNextPage) {
    const data: ExportMetaobjectDefinitionsResponse = await adminGraphQL<
      ExportMetaobjectDefinitionsResponse,
      { first: number; after: string | null }
    >(
      client,
      supportsFieldCapabilities
        ? METAOBJECT_DEFINITIONS_QUERY_WITH_FIELD_CAPABILITIES
        : METAOBJECT_DEFINITIONS_QUERY,
      {
      first: PAGE_SIZE,
      after,
      },
    )

    for (const node of data.metaobjectDefinitions.nodes) {
      items.push({
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description,
        displayNameKey: node.displayNameKey,
        standardTemplate: node.standardTemplate
          ? { type: node.standardTemplate.type }
          : null,
        access: {
          admin: node.access.admin,
          storefront: node.access.storefront,
        },
        capabilities: {
          publishable: {
            enabled: node.capabilities.publishable.enabled,
          },
          translatable: {
            enabled: node.capabilities.translatable.enabled,
          },
          renderable: {
            enabled: node.capabilities.renderable.enabled,
            data: {
              metaTitleKey:
                node.capabilities.renderable.data?.metaTitleKey ?? null,
              metaDescriptionKey:
                node.capabilities.renderable.data?.metaDescriptionKey ?? null,
            },
          },
          onlineStore: {
            enabled: node.capabilities.onlineStore.enabled,
          },
        },
        fieldDefinitions: node.fieldDefinitions.map((field): MetaobjectFieldDefinitionExport => ({
          key: field.key,
          name: field.name,
          description: field.description,
          required: field.required,
          type: field.type.name,
          validations: field.validations.map((validation): ValidationExport => ({
            name: validation.name,
            type: validation.type,
            value: validation.value,
          })),
          capabilities: {
            adminFilterable: {
              enabled:
                supportsFieldCapabilities &&
                field.capabilities?.adminFilterable.enabled === true,
            },
          },
        })),
      })
    }

    hasNextPage = data.metaobjectDefinitions.pageInfo.hasNextPage
    after = data.metaobjectDefinitions.pageInfo.endCursor
  }

  return items.sort((left, right) => left.type.localeCompare(right.type))
}

async function loadAllMetafieldDefinitions(
  client: ShopifyClient,
  ownerTypes: string[],
): Promise<MetafieldDefinitionExport[]> {
  const items: MetafieldDefinitionExport[] = []

  for (const ownerType of ownerTypes) {
    let after: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
      const data: ExportMetafieldDefinitionsResponse = await adminGraphQL<
        ExportMetafieldDefinitionsResponse,
        { ownerType: string; first: number; after: string | null }
      >(client, METAFIELD_DEFINITIONS_QUERY, {
        ownerType,
        first: PAGE_SIZE,
        after,
      })

      for (const node of data.metafieldDefinitions.nodes) {
        items.push({
          id: node.id,
          ownerType: node.ownerType,
          namespace: node.namespace,
          key: node.key,
          name: node.name,
          description: node.description,
          type: {
            name: node.type.name,
            category: node.type.category,
          },
          access: {
            admin: node.access.admin,
            storefront: node.access.storefront,
            customerAccount: node.access.customerAccount,
          },
          capabilities: {
            adminFilterable: {
              enabled: node.capabilities.adminFilterable.enabled,
            },
            smartCollectionCondition: {
              enabled: node.capabilities.smartCollectionCondition.enabled,
            },
            uniqueValues: {
              enabled: node.capabilities.uniqueValues.enabled,
            },
          },
          validations: node.validations.map((validation): ValidationExport => ({
            name: validation.name,
            type: validation.type,
            value: validation.value,
          })),
          constraints: node.constraints
            ? {
                key: node.constraints.key,
                values: node.constraints.values.nodes
                  .map((valueNode: { value: string }) => valueNode.value)
                  .sort((left: string, right: string) => left.localeCompare(right)),
              }
            : null,
          pinnedPosition: node.pinnedPosition,
          useAsCollectionCondition: node.useAsCollectionCondition,
          standardTemplate: node.standardTemplate
            ? {
                id: node.standardTemplate.id,
                namespace: node.standardTemplate.namespace,
                key: node.standardTemplate.key,
              }
            : null,
        })
      }

      hasNextPage = data.metafieldDefinitions.pageInfo.hasNextPage
      after = data.metafieldDefinitions.pageInfo.endCursor
    }
  }

  return items.sort((left, right) => {
    const ownerTypeOrder = left.ownerType.localeCompare(right.ownerType)
    if (ownerTypeOrder !== 0) return ownerTypeOrder

    const namespaceOrder = left.namespace.localeCompare(right.namespace)
    if (namespaceOrder !== 0) return namespaceOrder

    return left.key.localeCompare(right.key)
  })
}

export async function writeExportBundle(
  outputPath: string,
  bundle: DefinitionsExportBundle,
): Promise<void> {
  const absolutePath = path.resolve(outputPath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, JSON.stringify(bundle, null, 2) + '\n', 'utf8')
}

export async function readExportBundle(
  inputPath: string,
): Promise<DefinitionsExportBundle> {
  const absolutePath = path.resolve(inputPath)
  const raw = await readFile(absolutePath, 'utf8')
  const parsed = JSON.parse(raw) as DefinitionsExportBundle

  if (
    !Array.isArray(parsed.metaobjectDefinitions) ||
    !Array.isArray(parsed.metafieldDefinitions)
  ) {
    throw new Error(`Invalid definitions bundle: ${absolutePath}`)
  }

  return parsed
}

function buildMetafieldDefinitionKey(definition: {
  ownerType: string
  namespace: string
  key: string
}): string {
  return `${definition.ownerType}::${definition.namespace}::${definition.key}`
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (
      nestedValue &&
      typeof nestedValue === 'object' &&
      !Array.isArray(nestedValue)
    ) {
      return Object.keys(nestedValue as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (nestedValue as Record<string, unknown>)[key]
          return acc
        }, {})
    }

    return nestedValue
  })
}

function sortValidations(validations: ValidationExport[]): ValidationExport[] {
  return [...validations].sort((left, right) => {
    const nameOrder = left.name.localeCompare(right.name)
    if (nameOrder !== 0) return nameOrder

    const typeOrder = left.type.localeCompare(right.type)
    if (typeOrder !== 0) return typeOrder

    return (left.value ?? '').localeCompare(right.value ?? '')
  })
}

function areValidationsEqual(
  left: ValidationExport[],
  right: ValidationExport[],
): boolean {
  return stableStringify(sortValidations(left)) ===
    stableStringify(sortValidations(right))
}

function isAppOwnedNamespace(namespace: string): boolean {
  return namespace.startsWith('$app') || namespace.startsWith('app--')
}

function isAppOwnedMetaobjectType(type: string): boolean {
  return type.startsWith('$app') || type.startsWith('app--')
}

function remapValidationValue(
  validation: ValidationExport,
  metaobjectIdMap: Map<string, string>,
): ValidationExport {
  if (validation.value == null) return validation

  if (!validation.name.includes('metaobject_definition')) {
    return validation
  }

  const nextValue = validation.value.replace(
    /gid:\/\/shopify\/MetaobjectDefinition\/\d+/gu,
    (match) => {
      const mapped = metaobjectIdMap.get(match)
      if (!mapped) {
        throw new Error(
          `Missing target metaobject definition mapping for validation value ${match}`,
        )
      }
      return mapped
    },
  )

  return {
    ...validation,
    value: nextValue,
  }
}

export function toValidationInput(validation: ValidationExport): ValidationInput {
  const input: ValidationInput = {
    name: validation.name,
  }

  if (validation.value != null) {
    input.value = validation.value
  }

  return input
}

function remapValidations(
  validations: ValidationExport[],
  metaobjectIdMap: Map<string, string>,
): ValidationExport[] {
  return validations.map((validation) =>
    remapValidationValue(validation, metaobjectIdMap),
  )
}

export function toValidationInputs(
  validations: ValidationExport[],
): ValidationInput[] {
  return validations.map(toValidationInput)
}

export function normalizeAdminAccessForInput(
  access: string | null,
): 'MERCHANT_READ' | 'MERCHANT_READ_WRITE' | undefined {
  if (!access) return undefined

  if (access === 'MERCHANT_READ' || access === 'PUBLIC_READ') {
    return 'MERCHANT_READ'
  }

  if (
    access === 'MERCHANT_READ_WRITE' ||
    access === 'PUBLIC_READ_WRITE'
  ) {
    return 'MERCHANT_READ_WRITE'
  }

  return undefined
}

export function buildMetaobjectAccessInput(definition: MetaobjectDefinitionExport): {
  admin?: string
  storefront?: string
} | undefined {
  const access: {
    admin?: string
    storefront?: string
  } = {}

  const isMerchantOwned = !isAppOwnedMetaobjectType(definition.type)

  if (!isMerchantOwned) {
    const admin = normalizeAdminAccessForInput(definition.access.admin)
    if (admin) {
      access.admin = admin
    }
  }
  if (definition.access.storefront) {
    access.storefront = definition.access.storefront
  }

  return Object.keys(access).length > 0 ? access : undefined
}

function buildMetaobjectCapabilitiesInput(
  definition: MetaobjectDefinitionExport,
): Record<string, unknown> | undefined {
  const capabilities: Record<string, unknown> = {}

  capabilities.publishable = {
    enabled: definition.capabilities.publishable.enabled,
  }
  capabilities.translatable = {
    enabled: definition.capabilities.translatable.enabled,
  }
  capabilities.renderable = {
    enabled: definition.capabilities.renderable.enabled,
    ...(definition.capabilities.renderable.enabled &&
      (definition.capabilities.renderable.data.metaTitleKey ||
        definition.capabilities.renderable.data.metaDescriptionKey)
      ? {
          data: {
            metaTitleKey:
              definition.capabilities.renderable.data.metaTitleKey ?? undefined,
            metaDescriptionKey:
              definition.capabilities.renderable.data.metaDescriptionKey ??
              undefined,
          },
        }
      : {}),
  }
  capabilities.onlineStore = {
    enabled: definition.capabilities.onlineStore.enabled,
  }

  return capabilities
}

function buildMetaobjectFieldCreateInput(
  field: MetaobjectFieldDefinitionExport,
  metaobjectIdMap: Map<string, string>,
  supportsCapabilities: boolean,
): Record<string, unknown> {
  const validations = toValidationInputs(
    remapValidations(field.validations, metaobjectIdMap),
  )
  const input: Record<string, unknown> = {
    key: field.key,
    name: field.name ?? undefined,
    description: field.description ?? undefined,
    required: field.required,
    type: field.type,
    validations,
  }

  if (supportsCapabilities && field.capabilities.adminFilterable.enabled) {
    input.capabilities = {
      adminFilterable: {
        enabled: true,
      },
    }
  }

  return input
}

function buildMetaobjectFieldUpdateInput(
  field: MetaobjectFieldDefinitionExport,
  metaobjectIdMap: Map<string, string>,
  supportsCapabilities: boolean,
): Record<string, unknown> {
  const validations = toValidationInputs(
    remapValidations(field.validations, metaobjectIdMap),
  )
  const input: Record<string, unknown> = {
    key: field.key,
    name: field.name ?? undefined,
    description: field.description ?? undefined,
    required: field.required,
    validations,
  }

  if (supportsCapabilities && field.capabilities.adminFilterable.enabled) {
    input.capabilities = {
      adminFilterable: {
        enabled: true,
      },
    }
  }

  return input
}

export function buildMetafieldAccessInput(
  definition: MetafieldDefinitionExport,
): Record<string, unknown> | undefined {
  const access: Record<string, unknown> = {}
  const isMerchantOwned = !isAppOwnedNamespace(definition.namespace)

  if (!isMerchantOwned) {
    const admin = normalizeAdminAccessForInput(definition.access.admin)
    if (admin) {
      access.admin = admin
    }
  }
  if (definition.access.storefront) {
    access.storefront = definition.access.storefront
  }
  if (!isMerchantOwned && definition.access.customerAccount) {
    access.customerAccount = definition.access.customerAccount
  }

  return Object.keys(access).length > 0 ? access : undefined
}

function buildMetafieldCapabilitiesInput(
  definition: MetafieldDefinitionExport,
): Record<string, unknown> | undefined {
  const capabilities: Record<string, unknown> = {
    adminFilterable: {
      enabled: definition.capabilities.adminFilterable.enabled,
    },
    smartCollectionCondition: {
      enabled:
        definition.capabilities.smartCollectionCondition.enabled ||
        definition.useAsCollectionCondition,
    },
    uniqueValues: {
      enabled: definition.capabilities.uniqueValues.enabled,
    },
  }

  return capabilities
}

export function buildStandardMetafieldDefinitionEnableInput(
  definition: MetafieldDefinitionExport,
): {
  ownerType: string
  namespace: string | null
  key: string | null
  capabilities?: Record<string, unknown>
  pin: boolean
} {
  if (!definition.standardTemplate) {
    throw new Error(
      `Metafield definition ${definition.ownerType}:${definition.namespace}.${definition.key} is not backed by a standard template.`,
    )
  }

  const input: {
    ownerType: string
    namespace: string | null
    key: string | null
    capabilities?: Record<string, unknown>
    pin: boolean
  } = {
    ownerType: definition.ownerType,
    namespace: definition.standardTemplate.namespace,
    key: definition.standardTemplate.key,
    pin: false,
  }

  const capabilities = buildMetafieldCapabilitiesInput(definition)
  if (capabilities) {
    input.capabilities = capabilities
  }

  return input
}

function buildMetafieldConstraintsInput(
  definition: MetafieldDefinitionExport,
): Record<string, unknown> | undefined {
  if (!definition.constraints || !definition.constraints.key) return undefined

  return {
    key: definition.constraints.key,
    values: [...definition.constraints.values],
  }
}

function buildMetafieldConstraintsUpdatesInput(
  source: MetafieldDefinitionExport,
  target: MetafieldDefinitionExport,
): Record<string, unknown> | undefined {
  const sourceConstraints = source.constraints
  const targetConstraints = target.constraints

  const sourceKey = sourceConstraints?.key ?? null
  const targetKey = targetConstraints?.key ?? null

  if (!sourceConstraints && !targetConstraints) return undefined

  if (!sourceConstraints && targetConstraints) {
    return {
      key: null,
    }
  }

  if (!sourceConstraints || !sourceConstraints.key) return undefined

  const sourceValues = new Set(sourceConstraints.values)
  const targetValues = new Set(targetConstraints?.values ?? [])
  const values: Array<Record<string, string>> = []

  for (const value of sourceValues) {
    if (!targetValues.has(value)) {
      values.push({ create: value })
    }
  }

  for (const value of targetValues) {
    if (!sourceValues.has(value)) {
      values.push({ delete: value })
    }
  }

  if (sourceKey === targetKey && values.length === 0) return undefined

  return {
    key: sourceConstraints.key,
    values,
  }
}

function getMetaobjectDefinitionDependencies(
  definition: MetaobjectDefinitionExport,
): string[] {
  const ids = new Set<string>()

  for (const field of definition.fieldDefinitions) {
    for (const validation of field.validations) {
      if (!validation.name.includes('metaobject_definition')) continue
      const matches =
        validation.value?.match(/gid:\/\/shopify\/MetaobjectDefinition\/\d+/gu) ??
        []
      for (const match of matches) {
        ids.add(match)
      }
    }
  }

  return Array.from(ids)
}

function topologicalSortMetaobjectDefinitions(
  definitions: MetaobjectDefinitionExport[],
): MetaobjectDefinitionExport[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  const temporary = new Set<string>()
  const permanent = new Set<string>()
  const output: MetaobjectDefinitionExport[] = []

  function visit(definition: MetaobjectDefinitionExport) {
    if (permanent.has(definition.id)) return
    if (temporary.has(definition.id)) {
      throw new Error(
        `Detected a circular metaobject definition dependency involving ${definition.type}.`,
      )
    }

    temporary.add(definition.id)

    for (const dependencyId of getMetaobjectDefinitionDependencies(definition)) {
      const dependency = byId.get(dependencyId)
      if (!dependency) continue
      visit(dependency)
    }

    temporary.delete(definition.id)
    permanent.add(definition.id)
    output.push(definition)
  }

  for (const definition of definitions) {
    visit(definition)
  }

  return output
}

function buildTargetMetaobjectIndex(
  definitions: MetaobjectDefinitionExport[],
): Map<string, MetaobjectDefinitionExport> {
  return new Map(
    definitions.map((definition) => [definition.type, definition]),
  )
}

function buildTargetMetafieldIndex(
  definitions: MetafieldDefinitionExport[],
): Map<string, MetafieldDefinitionExport> {
  return new Map(
    definitions.map((definition) => [
      buildMetafieldDefinitionKey(definition),
      definition,
    ]),
  )
}

function buildDryRunMetaobjectDefinitionId(
  definition: MetaobjectDefinitionExport,
): string {
  return `gid://shopify/MetaobjectDefinition/DRY_RUN__${definition.type}`
}

type ApplyPlan = {
  createdMetaobjectDefinitions: number
  updatedMetaobjectDefinitions: number
  createdMetafieldDefinitions: number
  updatedMetafieldDefinitions: number
  pinnedMetafieldDefinitions: number
  unpinnedMetafieldDefinitions: number
  warnings: string[]
}

type ApplyOptions = {
  apply: boolean
  allowAppOwned?: boolean
}

export async function applyDefinitionsBundle(
  client: ShopifyClient,
  bundle: DefinitionsExportBundle,
  options: ApplyOptions,
): Promise<ApplyPlan> {
  const plan: ApplyPlan = {
    createdMetaobjectDefinitions: 0,
    updatedMetaobjectDefinitions: 0,
    createdMetafieldDefinitions: 0,
    updatedMetafieldDefinitions: 0,
    pinnedMetafieldDefinitions: 0,
    unpinnedMetafieldDefinitions: 0,
    warnings: [],
  }

  const sourceMetaobjectDefinitions = topologicalSortMetaobjectDefinitions(
    bundle.metaobjectDefinitions,
  )
  const targetSupportsMetaobjectFieldCapabilities =
    (await objectTypeHasField(
      client,
      'MetaobjectFieldDefinition',
      'capabilities',
    )) &&
    (await inputTypeHasField(
      client,
      'MetaobjectFieldDefinitionCreateInput',
      'capabilities',
    )) &&
    (await inputTypeHasField(
      client,
      'MetaobjectFieldDefinitionUpdateInput',
      'capabilities',
    ))
  const targetMetaobjectDefinitions = await loadAllMetaobjectDefinitions(client)
  const targetMetafieldDefinitions = await loadAllMetafieldDefinitions(
    client,
    bundle.ownerTypes,
  )

  const targetMetaobjectIndex =
    buildTargetMetaobjectIndex(targetMetaobjectDefinitions)
  const targetMetafieldIndex =
    buildTargetMetafieldIndex(targetMetafieldDefinitions)

  const oldMetaobjectIdToTargetId = new Map<string, string>()
  for (const sourceDefinition of sourceMetaobjectDefinitions) {
    for (const field of sourceDefinition.fieldDefinitions) {
      if (
        field.capabilities.adminFilterable.enabled &&
        !targetSupportsMetaobjectFieldCapabilities
      ) {
        throw new Error(
          `Target API version ${client.apiVersion} does not support metaobject field capabilities, but source definition ${sourceDefinition.type}.${field.key} uses adminFilterable. Re-run with SHOPIFY_TARGET_API_VERSION=2026-04 or newer.`,
        )
      }
    }

    const existing = targetMetaobjectIndex.get(sourceDefinition.type)
    if (existing) {
      oldMetaobjectIdToTargetId.set(sourceDefinition.id, existing.id)
      continue
    }

    if (!options.apply) {
      oldMetaobjectIdToTargetId.set(
        sourceDefinition.id,
        buildDryRunMetaobjectDefinitionId(sourceDefinition),
      )
    }
  }

  for (const sourceDefinition of sourceMetaobjectDefinitions) {
    if (
      isAppOwnedMetaobjectType(sourceDefinition.type) &&
      !options.allowAppOwned
    ) {
      throw new Error(
        `Metaobject definition ${sourceDefinition.type} looks app-owned. Re-run with --allow-app-owned if you really want to proceed.`,
      )
    }

    const existing = targetMetaobjectIndex.get(sourceDefinition.type)

    if (!existing) {
      if (sourceDefinition.standardTemplate) {
        if (options.apply) {
          const data = await adminGraphQL<
            DefinitionMutationResult<
              'standardMetaobjectDefinitionEnable',
              { metaobjectDefinition: { id: string; type: string; name: string | null } | null }
            >,
            { type: string }
          >(client, STANDARD_METAOBJECT_DEFINITION_ENABLE_MUTATION, {
            type: sourceDefinition.type,
          })

          const result = data.standardMetaobjectDefinitionEnable
          assertNoUserErrors(
            `Failed enabling standard metaobject definition ${sourceDefinition.type}`,
            result.userErrors,
          )
          if (!result.metaobjectDefinition) {
            throw new Error(
              `standardMetaobjectDefinitionEnable returned no definition for ${sourceDefinition.type}.`,
            )
          }
          plan.createdMetaobjectDefinitions += 1
          oldMetaobjectIdToTargetId.set(
            sourceDefinition.id,
            result.metaobjectDefinition.id,
          )
        } else {
          plan.createdMetaobjectDefinitions += 1
        }
      } else {
        const definitionInput: Record<string, unknown> = {
          type: sourceDefinition.type,
          name: sourceDefinition.name ?? undefined,
          description: sourceDefinition.description ?? undefined,
          displayNameKey: sourceDefinition.displayNameKey ?? undefined,
          access: buildMetaobjectAccessInput(sourceDefinition),
          capabilities: buildMetaobjectCapabilitiesInput(sourceDefinition),
          fieldDefinitions: sourceDefinition.fieldDefinitions.map((field) =>
            buildMetaobjectFieldCreateInput(
              field,
              oldMetaobjectIdToTargetId,
              targetSupportsMetaobjectFieldCapabilities,
            ),
          ),
        }

        if (options.apply) {
          const data = await adminGraphQL<
            DefinitionMutationResult<
              'metaobjectDefinitionCreate',
              { metaobjectDefinition: { id: string; type: string; name: string | null } | null }
            >,
            { definition: Record<string, unknown> }
          >(client, METAOBJECT_DEFINITION_CREATE_MUTATION, {
            definition: definitionInput,
          })

          const result = data.metaobjectDefinitionCreate
          assertNoUserErrors(
            `Failed creating metaobject definition ${sourceDefinition.type}`,
            result.userErrors,
          )
          if (!result.metaobjectDefinition) {
            throw new Error(
              `metaobjectDefinitionCreate returned no definition for ${sourceDefinition.type}.`,
            )
          }

          plan.createdMetaobjectDefinitions += 1
          oldMetaobjectIdToTargetId.set(
            sourceDefinition.id,
            result.metaobjectDefinition.id,
          )
        } else {
          plan.createdMetaobjectDefinitions += 1
        }
      }

      continue
    }

    oldMetaobjectIdToTargetId.set(sourceDefinition.id, existing.id)

    const existingFields = new Map(
      existing.fieldDefinitions.map((field) => [field.key, field]),
    )
    const missingKeys = existing.fieldDefinitions
      .map((field) => field.key)
      .filter(
        (key) =>
          !sourceDefinition.fieldDefinitions.some((field) => field.key === key),
      )

    if (missingKeys.length > 0) {
      throw new Error(
        `Target metaobject definition ${sourceDefinition.type} has extra fields not present in source: ${missingKeys.join(', ')}`,
      )
    }

    const fieldOperations: Array<Record<string, unknown>> = []
    let immutableMismatch: string | null = null

    for (const sourceField of sourceDefinition.fieldDefinitions) {
      const targetField = existingFields.get(sourceField.key)
      if (!targetField) {
        fieldOperations.push({
          create: buildMetaobjectFieldCreateInput(
            sourceField,
            oldMetaobjectIdToTargetId,
            targetSupportsMetaobjectFieldCapabilities,
          ),
        })
        continue
      }

      if (targetField.type !== sourceField.type) {
        immutableMismatch =
          `Field ${sourceField.key} on ${sourceDefinition.type} has type ${targetField.type} in target but ${sourceField.type} in source.`
        break
      }

      const remappedValidations = remapValidations(
        sourceField.validations,
        oldMetaobjectIdToTargetId,
      )
      const needsUpdate =
        (targetField.name ?? null) !== (sourceField.name ?? null) ||
        (targetField.description ?? null) !==
          (sourceField.description ?? null) ||
        targetField.required !== sourceField.required ||
        !areValidationsEqual(targetField.validations, remappedValidations) ||
        targetField.capabilities.adminFilterable.enabled !==
          sourceField.capabilities.adminFilterable.enabled

      if (needsUpdate) {
        fieldOperations.push({
          update: buildMetaobjectFieldUpdateInput(
            sourceField,
            oldMetaobjectIdToTargetId,
            targetSupportsMetaobjectFieldCapabilities,
          ),
        })
      }
    }

    if (immutableMismatch) {
      throw new Error(immutableMismatch)
    }

    const orderMatches =
      stableStringify(
        existing.fieldDefinitions.map((field) => field.key),
      ) ===
      stableStringify(
        sourceDefinition.fieldDefinitions.map((field) => field.key),
      )

    const definitionUpdate: Record<string, unknown> = {
      name: sourceDefinition.name ?? undefined,
      description: sourceDefinition.description ?? undefined,
      displayNameKey: sourceDefinition.displayNameKey ?? undefined,
      access: buildMetaobjectAccessInput(sourceDefinition),
      capabilities: buildMetaobjectCapabilitiesInput(sourceDefinition),
    }

    if (fieldOperations.length > 0 || !orderMatches) {
      definitionUpdate.fieldDefinitions =
        fieldOperations.length > 0
          ? fieldOperations
          : sourceDefinition.fieldDefinitions.map((field) => ({
              update: buildMetaobjectFieldUpdateInput(
                field,
                oldMetaobjectIdToTargetId,
                targetSupportsMetaobjectFieldCapabilities,
              ),
            }))
      definitionUpdate.resetFieldOrder = !orderMatches
    }

    const updateIsNoOp =
      stableStringify(existing.access) === stableStringify(sourceDefinition.access) &&
      stableStringify(existing.capabilities) ===
        stableStringify(sourceDefinition.capabilities) &&
      (existing.name ?? null) === (sourceDefinition.name ?? null) &&
      (existing.description ?? null) === (sourceDefinition.description ?? null) &&
      (existing.displayNameKey ?? null) ===
        (sourceDefinition.displayNameKey ?? null) &&
      fieldOperations.length === 0 &&
      orderMatches

    if (!updateIsNoOp) {
      if (options.apply) {
        const data = await adminGraphQL<
          DefinitionMutationResult<
            'metaobjectDefinitionUpdate',
            { metaobjectDefinition: { id: string; type: string; name: string | null } | null }
          >,
          { id: string; definition: Record<string, unknown> }
        >(client, METAOBJECT_DEFINITION_UPDATE_MUTATION, {
          id: existing.id,
          definition: definitionUpdate,
        })

        const result = data.metaobjectDefinitionUpdate
        assertNoUserErrors(
          `Failed updating metaobject definition ${sourceDefinition.type}`,
          result.userErrors,
        )
      }

      plan.updatedMetaobjectDefinitions += 1
    }
  }

  for (const sourceDefinition of bundle.metafieldDefinitions) {
    if (
      isAppOwnedNamespace(sourceDefinition.namespace) &&
      !options.allowAppOwned
    ) {
      throw new Error(
        `Metafield definition ${sourceDefinition.ownerType}:${sourceDefinition.namespace}.${sourceDefinition.key} looks app-owned. Re-run with --allow-app-owned if you really want to proceed.`,
      )
    }

    const definitionKey = buildMetafieldDefinitionKey(sourceDefinition)
    const existing = targetMetafieldIndex.get(definitionKey)
    const remappedValidations = remapValidations(
      sourceDefinition.validations,
      oldMetaobjectIdToTargetId,
    )
    const validationInputs = toValidationInputs(remappedValidations)

    if (!existing) {
      if (sourceDefinition.standardTemplate) {
        if (options.apply) {
          const data = await adminGraphQL<
            DefinitionMutationResult<
              'standardMetafieldDefinitionEnable',
              { createdDefinition: { id: string; ownerType: string; namespace: string; key: string; name: string } | null }
            >,
            {
              ownerType: string
              namespace: string | null
              key: string | null
              capabilities?: Record<string, unknown>
              pin: boolean
            }
          >(
            client,
            STANDARD_METAFIELD_DEFINITION_ENABLE_MUTATION,
            buildStandardMetafieldDefinitionEnableInput(sourceDefinition),
          )

          const result = data.standardMetafieldDefinitionEnable
          assertNoUserErrors(
            `Failed enabling standard metafield definition ${sourceDefinition.ownerType}:${sourceDefinition.namespace}.${sourceDefinition.key}`,
            result.userErrors,
          )
        }

        plan.createdMetafieldDefinitions += 1
      } else {
        const definitionInput: Record<string, unknown> = {
          name: sourceDefinition.name,
          namespace: sourceDefinition.namespace,
          key: sourceDefinition.key,
          ownerType: sourceDefinition.ownerType,
          description: sourceDefinition.description ?? undefined,
          type: sourceDefinition.type.name,
          access: buildMetafieldAccessInput(sourceDefinition),
          capabilities: buildMetafieldCapabilitiesInput(sourceDefinition),
          validations: validationInputs,
          constraints: buildMetafieldConstraintsInput(sourceDefinition),
        }

        if (options.apply) {
          const data = await adminGraphQL<
            DefinitionMutationResult<
              'metafieldDefinitionCreate',
              { createdDefinition: { id: string; ownerType: string; namespace: string; key: string; name: string } | null }
            >,
            { definition: Record<string, unknown> }
          >(client, METAFIELD_DEFINITION_CREATE_MUTATION, {
            definition: definitionInput,
          })

          const result = data.metafieldDefinitionCreate
          assertNoUserErrors(
            `Failed creating metafield definition ${sourceDefinition.ownerType}:${sourceDefinition.namespace}.${sourceDefinition.key}`,
            result.userErrors,
          )
        }

        plan.createdMetafieldDefinitions += 1
      }

      continue
    }

    if (existing.type.name !== sourceDefinition.type.name) {
      throw new Error(
        `Target metafield definition ${sourceDefinition.ownerType}:${sourceDefinition.namespace}.${sourceDefinition.key} has type ${existing.type.name} but source type is ${sourceDefinition.type.name}.`,
      )
    }

    const updateInput: Record<string, unknown> = {
      ownerType: sourceDefinition.ownerType,
      namespace: sourceDefinition.namespace,
      key: sourceDefinition.key,
      name: sourceDefinition.name,
      description: sourceDefinition.description ?? undefined,
      access: buildMetafieldAccessInput(sourceDefinition),
      capabilities: buildMetafieldCapabilitiesInput(sourceDefinition),
      validations: validationInputs,
    }

    const constraintsUpdates = buildMetafieldConstraintsUpdatesInput(
      sourceDefinition,
      existing,
    )
    if (constraintsUpdates) {
      updateInput.constraintsUpdates = constraintsUpdates
    }

    const updateIsNoOp =
      existing.name === sourceDefinition.name &&
      (existing.description ?? null) === (sourceDefinition.description ?? null) &&
      stableStringify(existing.access) === stableStringify(sourceDefinition.access) &&
      stableStringify(existing.capabilities) ===
        stableStringify(sourceDefinition.capabilities) &&
      areValidationsEqual(existing.validations, remappedValidations) &&
      !constraintsUpdates

    if (!updateIsNoOp) {
      if (options.apply) {
        const data = await adminGraphQL<
          DefinitionMutationResult<
            'metafieldDefinitionUpdate',
            { updatedDefinition: { id: string; ownerType: string; namespace: string; key: string; name: string } | null }
          >,
          { definition: Record<string, unknown> }
        >(client, METAFIELD_DEFINITION_UPDATE_MUTATION, {
          definition: updateInput,
        })

        const result = data.metafieldDefinitionUpdate
        assertNoUserErrors(
          `Failed updating metafield definition ${sourceDefinition.ownerType}:${sourceDefinition.namespace}.${sourceDefinition.key}`,
          result.userErrors,
        )
      }

      plan.updatedMetafieldDefinitions += 1
    }
  }

  const refreshedMetafieldDefinitions = await loadAllMetafieldDefinitions(
    client,
    bundle.ownerTypes,
  )
  const refreshedMetafieldIndex =
    buildTargetMetafieldIndex(refreshedMetafieldDefinitions)

  const byOwnerType = new Map<string, MetafieldDefinitionExport[]>()
  for (const definition of bundle.metafieldDefinitions) {
    const list = byOwnerType.get(definition.ownerType) ?? []
    list.push(definition)
    byOwnerType.set(definition.ownerType, list)
  }

  for (const [ownerType, definitions] of byOwnerType) {
    const desiredPinned = definitions
      .filter((definition) => definition.pinnedPosition != null)
      .sort(
        (left, right) =>
          (left.pinnedPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.pinnedPosition ?? Number.MAX_SAFE_INTEGER),
      )

    const importedCurrent = definitions
      .map((definition) => refreshedMetafieldIndex.get(buildMetafieldDefinitionKey(definition)))
      .filter(
        (definition): definition is MetafieldDefinitionExport => Boolean(definition),
      )

    const currentlyPinned = importedCurrent.filter(
      (definition) => definition.pinnedPosition != null,
    )

    if (!options.apply) {
      plan.unpinnedMetafieldDefinitions += currentlyPinned.length
      plan.pinnedMetafieldDefinitions += desiredPinned.length
      continue
    }

    for (const definition of currentlyPinned) {
      const data = await adminGraphQL<
        DefinitionMutationResult<
          'metafieldDefinitionUnpin',
          { unpinnedDefinition: { id: string } | null }
        >,
        { definitionId: string }
      >(client, METAFIELD_DEFINITION_UNPIN_MUTATION, {
        definitionId: definition.id,
      })

      const result = data.metafieldDefinitionUnpin
      assertNoUserErrors(
        `Failed unpinning metafield definition ${definition.ownerType}:${definition.namespace}.${definition.key}`,
        result.userErrors,
      )

      plan.unpinnedMetafieldDefinitions += 1
    }

    for (const definition of desiredPinned) {
      const targetDefinition = refreshedMetafieldIndex.get(
        buildMetafieldDefinitionKey(definition),
      )
      if (!targetDefinition) {
        throw new Error(
          `Unable to restore pinning for ${ownerType}:${definition.namespace}.${definition.key}; definition missing in target after apply.`,
        )
      }

      const data = await adminGraphQL<
        DefinitionMutationResult<
          'metafieldDefinitionPin',
          { pinnedDefinition: { id: string } | null }
        >,
        { definitionId: string }
      >(client, METAFIELD_DEFINITION_PIN_MUTATION, {
        definitionId: targetDefinition.id,
      })

      const result = data.metafieldDefinitionPin
      assertNoUserErrors(
        `Failed pinning metafield definition ${definition.ownerType}:${definition.namespace}.${definition.key}`,
        result.userErrors,
      )

      plan.pinnedMetafieldDefinitions += 1
    }
  }

  return plan
}

export function resolveOutputPath(rawPath?: string): string {
  return path.resolve(
    rawPath?.trim() || 'tmp/shopify-definition-export.json',
  )
}

export function parseFlagValue(
  argv: string[],
  name: string,
): string | undefined {
  const prefixed = `--${name}=`
  const match = argv.find((arg) => arg.startsWith(prefixed))
  if (!match) return undefined
  return match.slice(prefixed.length)
}

export function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`)
}

export function printPlanSummary(plan: ApplyPlan): void {
  console.log('Plan summary:')
  console.log(
    `- Metaobject definitions: create=${plan.createdMetaobjectDefinitions}, update=${plan.updatedMetaobjectDefinitions}`,
  )
  console.log(
    `- Metafield definitions: create=${plan.createdMetafieldDefinitions}, update=${plan.updatedMetafieldDefinitions}`,
  )
  console.log(
    `- Metafield pinning: unpin=${plan.unpinnedMetafieldDefinitions}, pin=${plan.pinnedMetafieldDefinitions}`,
  )

  if (plan.warnings.length > 0) {
    console.log('Warnings:')
    for (const warning of plan.warnings) {
      console.log(`- ${warning}`)
    }
  }
}
