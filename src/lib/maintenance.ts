const MAINTENANCE_BYPASS_QUERY_PARAM = 'maintenance'
const MAINTENANCE_BYPASS_COOKIE = 'vayer_maintenance_bypass'
const MAINTENANCE_BYPASS_COOKIE_MAX_AGE = 60 * 60 * 4
const MAINTENANCE_RETRY_AFTER_SECONDS = '600'

const MAINTENANCE_TITLE = 'Scheduled Maintenance'
const MAINTENANCE_MESSAGE =
  'We are updating the site and will be back shortly. Please check again in a few minutes.'

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on'])

export interface MaintenanceConfig {
  enabled: boolean
  bypassToken?: string
  allowedPaths?: readonly string[]
}

interface MaintenanceGateResult {
  allowRequest: boolean
  bypassCookieValue?: string
  redirectUrl?: string
}

export function isMaintenanceEnabled(value: string | undefined): boolean {
  if (!value) return false

  return TRUTHY_VALUES.has(value.trim().toLowerCase())
}

export function evaluateMaintenanceGate(
  request: Request,
  config: MaintenanceConfig,
): MaintenanceGateResult {
  if (!config.enabled) {
    return { allowRequest: true }
  }

  const bypassToken = normalizeSecret(config.bypassToken)

  if (hasBypassCookie(request, bypassToken)) {
    return { allowRequest: true }
  }

  const url = new URL(request.url)

  if (config.allowedPaths?.includes(url.pathname)) {
    return { allowRequest: true }
  }

  if (!bypassToken) {
    return { allowRequest: false }
  }

  const bypassValue = url.searchParams.get(MAINTENANCE_BYPASS_QUERY_PARAM)

  if (bypassValue !== bypassToken) {
    return { allowRequest: false }
  }

  url.searchParams.delete(MAINTENANCE_BYPASS_QUERY_PARAM)

  return {
    allowRequest: true,
    bypassCookieValue: bypassToken,
    redirectUrl: url.toString(),
  }
}

export function createMaintenanceResponse(request: Request): Response {
  const body =
    request.method === 'HEAD'
      ? null
      : `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(MAINTENANCE_TITLE)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f0e8;
        --panel: rgba(255, 255, 255, 0.88);
        --text: #1f1811;
        --muted: #6a5848;
        --border: rgba(31, 24, 17, 0.1);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(162, 132, 102, 0.18), transparent 40%),
          linear-gradient(180deg, #f8f4ee 0%, var(--bg) 100%);
        color: var(--text);
        font-family: "Lora", Georgia, serif;
      }

      main {
        width: min(100%, 640px);
        padding: 40px 32px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        backdrop-filter: blur(8px);
        box-shadow: 0 24px 80px rgba(31, 24, 17, 0.08);
      }

      .eyebrow {
        margin: 0 0 12px;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 5vw, 3.25rem);
        line-height: 1.05;
        font-weight: 500;
      }

      p {
        margin: 18px 0 0;
        font-size: 1.05rem;
        line-height: 1.7;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">VayerArt Gallery</p>
      <h1>${escapeHtml(MAINTENANCE_TITLE)}</h1>
      <p>${escapeHtml(MAINTENANCE_MESSAGE)}</p>
    </main>
  </body>
</html>`

  return new Response(body, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Retry-After': MAINTENANCE_RETRY_AFTER_SECONDS,
    },
  })
}

export function createBypassRedirect(url: string, bypassCookieValue: string) {
  const response = Response.redirect(url, 302)
  return appendBypassCookie(response, bypassCookieValue)
}

function hasBypassCookie(
  request: Request,
  bypassToken: string | undefined,
): boolean {
  if (!bypassToken) {
    return false
  }

  const cookieValue = getCookieValue(
    request.headers.get('cookie'),
    MAINTENANCE_BYPASS_COOKIE,
  )

  return cookieValue === bypassToken
}

function appendBypassCookie(
  response: Response,
  bypassCookieValue: string,
): Response {
  const next = new Response(response.body, response)

  next.headers.append(
    'Set-Cookie',
    `${MAINTENANCE_BYPASS_COOKIE}=${encodeURIComponent(bypassCookieValue)}; Max-Age=${MAINTENANCE_BYPASS_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  )

  return next
}

function getCookieValue(
  cookieHeader: string | null,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined

  const parts = cookieHeader.split(';')

  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split('=')

    if (name !== cookieName) {
      continue
    }

    return decodeCookieComponent(valueParts.join('='))
  }

  return undefined
}

function decodeCookieComponent(value: string): string | undefined {
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
