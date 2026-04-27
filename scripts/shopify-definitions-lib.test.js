import { describe, expect, it } from 'bun:test'

import {
  buildMetafieldAccessInput,
  buildMetaobjectAccessInput,
  buildStandardMetafieldDefinitionEnableInput,
  normalizeAdminAccessForInput,
  toValidationInputs,
} from './shopify-definitions-lib'

function createMetafieldDefinition(overrides = {}) {
  return {
    id: 'gid://shopify/MetafieldDefinition/1',
    ownerType: 'PRODUCT',
    namespace: 'custom',
    key: 'example',
    name: 'Example',
    description: null,
    type: {
      name: 'single_line_text_field',
      category: 'TEXT',
    },
    access: {
      admin: 'PUBLIC_READ_WRITE',
      storefront: 'PUBLIC_READ',
      customerAccount: 'READ',
    },
    capabilities: {
      adminFilterable: {
        enabled: false,
      },
      smartCollectionCondition: {
        enabled: false,
      },
      uniqueValues: {
        enabled: false,
      },
    },
    validations: [
      {
        name: 'regex',
        type: 'single_line_text_field',
        value: '^[a-z]+$',
      },
    ],
    constraints: null,
    pinnedPosition: null,
    useAsCollectionCondition: false,
    standardTemplate: null,
    ...overrides,
  }
}

function createMetaobjectDefinition(overrides = {}) {
  return {
    id: 'gid://shopify/MetaobjectDefinition/1',
    name: 'Theme',
    type: 'theme',
    description: null,
    displayNameKey: 'label',
    access: {
      admin: 'PUBLIC_READ_WRITE',
      storefront: 'PUBLIC_READ',
    },
    capabilities: {
      publishable: {
        enabled: true,
      },
      translatable: {
        enabled: false,
      },
      renderable: {
        enabled: false,
        data: {
          metaTitleKey: null,
          metaDescriptionKey: null,
        },
      },
      onlineStore: {
        enabled: false,
      },
    },
    standardTemplate: null,
    fieldDefinitions: [],
    ...overrides,
  }
}

describe('shopify definitions helpers', () => {
  it('strips validation type when building mutation inputs', () => {
    expect(
      toValidationInputs([
        {
          name: 'regex',
          type: 'single_line_text_field',
          value: '^[a-z]+$',
        },
      ]),
    ).toEqual([
      {
        name: 'regex',
        value: '^[a-z]+$',
      },
    ])
  })

  it('normalizes query-side admin access enums to mutation-side enums', () => {
    expect(normalizeAdminAccessForInput('PUBLIC_READ')).toBe('MERCHANT_READ')
    expect(normalizeAdminAccessForInput('PUBLIC_READ_WRITE')).toBe(
      'MERCHANT_READ_WRITE',
    )
    expect(normalizeAdminAccessForInput('MERCHANT_READ_WRITE')).toBe(
      'MERCHANT_READ_WRITE',
    )
  })

  it('omits metafield access for merchant-owned namespaces', () => {
    const definition = createMetafieldDefinition({
      namespace: 'custom',
    })

    expect(buildMetafieldAccessInput(definition)).toEqual({
      storefront: 'PUBLIC_READ',
    })
  })

  it('keeps metafield access for app-owned namespaces and normalizes admin access', () => {
    const definition = createMetafieldDefinition({
      namespace: 'app--12345',
      access: {
        admin: 'PUBLIC_READ_WRITE',
        storefront: 'PUBLIC_READ',
        customerAccount: 'READ_WRITE',
      },
    })

    expect(buildMetafieldAccessInput(definition)).toEqual({
      admin: 'MERCHANT_READ_WRITE',
      storefront: 'PUBLIC_READ',
      customerAccount: 'READ_WRITE',
    })
  })

  it('omits metaobject admin access for merchant-owned definitions', () => {
    const definition = createMetaobjectDefinition({
      type: 'theme',
    })

    expect(buildMetaobjectAccessInput(definition)).toEqual({
      storefront: 'PUBLIC_READ',
    })
  })

  it('keeps standard metafield enable payload free of access settings', () => {
    const definition = createMetafieldDefinition({
      namespace: 'shopify',
      key: 'art-movement',
      standardTemplate: {
        id: 'gid://shopify/StandardMetafieldDefinitionTemplate/42',
        namespace: 'shopify',
        key: 'art-movement',
      },
      capabilities: {
        adminFilterable: {
          enabled: true,
        },
        smartCollectionCondition: {
          enabled: false,
        },
        uniqueValues: {
          enabled: false,
        },
      },
    })

    expect(buildStandardMetafieldDefinitionEnableInput(definition)).toEqual({
      ownerType: 'PRODUCT',
      namespace: 'shopify',
      key: 'art-movement',
      capabilities: {
        adminFilterable: {
          enabled: true,
        },
        smartCollectionCondition: {
          enabled: false,
        },
        uniqueValues: {
          enabled: false,
        },
      },
      pin: false,
    })
  })
})
