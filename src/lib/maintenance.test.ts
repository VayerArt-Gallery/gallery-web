import { describe, expect, it } from 'vitest'

import {
  createBypassRedirect,
  createMaintenanceResponse,
  evaluateMaintenanceGate,
  isMaintenanceEnabled,
} from './maintenance'

describe('maintenance helpers', () => {
  it('parses truthy maintenance values', () => {
    expect(isMaintenanceEnabled('true')).toBe(true)
    expect(isMaintenanceEnabled('  ON  ')).toBe(true)
    expect(isMaintenanceEnabled('1')).toBe(true)
    expect(isMaintenanceEnabled('off')).toBe(false)
    expect(isMaintenanceEnabled(undefined)).toBe(false)
  })

  it('allows exact public paths during maintenance', () => {
    const request = new Request('https://example.com/robots.txt')
    const result = evaluateMaintenanceGate(request, {
      enabled: true,
      allowedPaths: ['/robots.txt'],
    })

    expect(result.allowRequest).toBe(true)
  })

  it('does not allow partial path matches', () => {
    const request = new Request('https://example.com/robots.txt.bak')
    const result = evaluateMaintenanceGate(request, {
      enabled: true,
      allowedPaths: ['/robots.txt'],
    })

    expect(result.allowRequest).toBe(false)
  })

  it('creates bypass redirects when the query token matches', () => {
    const request = new Request(
      'https://example.com/artworks?maintenance=secret-token&view=grid',
    )
    const result = evaluateMaintenanceGate(request, {
      enabled: true,
      bypassToken: ' secret-token ',
    })

    expect(result.allowRequest).toBe(true)
    expect(result.bypassCookieValue).toBe('secret-token')
    expect(result.redirectUrl).toBe('https://example.com/artworks?view=grid')
  })

  it('allows requests with a valid bypass cookie', () => {
    const request = new Request('https://example.com/artworks', {
      headers: {
        cookie: 'vayer_maintenance_bypass=secret-token',
      },
    })

    const result = evaluateMaintenanceGate(request, {
      enabled: true,
      bypassToken: 'secret-token',
    })

    expect(result).toEqual({ allowRequest: true })
  })

  it('ignores malformed bypass cookies', () => {
    const request = new Request('https://example.com/artworks', {
      headers: {
        cookie: 'vayer_maintenance_bypass=%E0%A4%A',
      },
    })

    const result = evaluateMaintenanceGate(request, {
      enabled: true,
      bypassToken: 'secret-token',
    })

    expect(result.allowRequest).toBe(false)
  })

  it('returns a 503 maintenance response', async () => {
    const response = createMaintenanceResponse(new Request('https://example.com/'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('600')
    expect(await response.text()).toContain('Scheduled maintenance')
  })

  it('returns an empty body for HEAD requests', async () => {
    const response = createMaintenanceResponse(
      new Request('https://example.com/', { method: 'HEAD' }),
    )

    expect(response.status).toBe(503)
    expect(await response.text()).toBe('')
  })

  it('sets a secure bypass cookie on redirect responses', () => {
    const response = createBypassRedirect(
      'https://example.com/artworks',
      'secret-token',
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/artworks')
    expect(response.headers.get('set-cookie')).toContain(
      'vayer_maintenance_bypass=secret-token',
    )
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })
})
