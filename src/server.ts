import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'

import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

import {
  createBypassRedirect,
  createMaintenanceResponse,
  evaluateMaintenanceGate,
  isMaintenanceEnabled,
} from '@/lib/maintenance'

const appFetch = createStartHandler(defaultStreamHandler)
const MAINTENANCE_ALLOWED_PATHS = ['/favicon.ico', '/robots.txt'] as const

const fetch: RequestHandler<Register> = async (request) => {
  const maintenanceConfig = {
    enabled: isMaintenanceEnabled(process.env.MAINTENANCE_MODE),
    bypassToken: process.env.MAINTENANCE_BYPASS_TOKEN,
    allowedPaths: MAINTENANCE_ALLOWED_PATHS,
  }

  const gate = evaluateMaintenanceGate(request, maintenanceConfig)

  if (!gate.allowRequest) {
    return createMaintenanceResponse(request)
  }

  if (gate.redirectUrl && gate.bypassCookieValue) {
    return createBypassRedirect(gate.redirectUrl, gate.bypassCookieValue)
  }

  return appFetch(request)
}

export default { fetch }
