import type { PlatformStatusResponse } from './admin'
import type { ApiClient } from './client'

export function platformApi(client: ApiClient) {
  return {
    /** Endpoint público (sin auth) — devuelve estado del horario operativo. */
    getStatus: () => client.get<PlatformStatusResponse>('platform-status'),
  }
}
