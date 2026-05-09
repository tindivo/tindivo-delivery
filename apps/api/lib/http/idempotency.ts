import { createHash, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorCodes } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from './problem'

/**
 * Wrapper de idempotencia tipo Stripe para endpoints POST de creación.
 *
 * Resuelve el bug verificado en producción: 6 pares de pedidos duplicados
 * creados a <60s de diferencia (todos `restaurant_pwa`, todos cancelados a
 * los 5min por `auto_cancel_unaccepted_orders`). Causa: doble click /
 * reintento de browser sin barrera servidor.
 *
 * Comportamiento:
 * - Sin header `Idempotency-Key`           → ejecuta handler tal cual (back-compat).
 * - Header inválido (no UUID v4)           → 400 VALIDATION_ERROR.
 * - Key+scope existe, body coincide        → devuelve respuesta cacheada.
 * - Key+scope existe, body distinto        → 409 IDEMPOTENCY_KEY_MISMATCH.
 * - Key nueva                              → ejecuta handler, cachea solo si status<500.
 *
 * Las 5xx NO se cachean: permite que el cliente reintente con la misma key
 * tras un fallo transitorio del servidor.
 *
 * El `scope` evita colisiones entre endpoints distintos: el cliente puede
 * reusar el mismo UUID para POSTs diferentes y cada uno se cachea por separado.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function withIdempotency(
  req: NextRequest,
  scope: string,
  body: unknown,
  admin: SupabaseClient,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key')?.trim()

  if (!key) return handler()

  if (!UUID_RE.test(key)) {
    return problemCode(ErrorCodes.VALIDATION_ERROR, 400, 'Idempotency-Key debe ser un UUID v4')
  }

  const requestHash = sha256(stableStringify(body))
  const table = admin.from('idempotency_keys') as ReturnType<SupabaseClient['from']>

  const { data: cached } = await table
    .select('request_hash, response_status, response_body')
    .eq('key', key)
    .eq('scope', scope)
    .maybeSingle()

  if (cached) {
    if (cached.request_hash !== requestHash) {
      return problemCode(
        'IDEMPOTENCY_KEY_MISMATCH',
        409,
        'Esta Idempotency-Key fue usada con un body diferente',
      )
    }
    return NextResponse.json(cached.response_body, { status: cached.response_status })
  }

  const response = await handler()

  if (response.status < 500) {
    let responseBody: unknown = null
    try {
      // clone() para no consumir el body que Next.js todavía debe enviar al cliente.
      responseBody = await response
        .clone()
        .json()
        .catch(() => null)
    } catch {
      // Respuesta sin JSON parseable (204, etc.) — cacheamos null.
    }

    const insert = await table.insert({
      key,
      scope,
      request_hash: requestHash,
      response_status: response.status,
      response_body: (responseBody ?? {}) as never,
    })

    // Race entre dos requests con la misma key llegando en simultáneo:
    // la primera hizo el INSERT, esta falla por PK (23505). La respuesta
    // del cliente es correcta de todas formas, solo no se cacheó esta vez.
    if (insert.error && insert.error.code !== '23505') {
      console.warn('[idempotency] insert failed', {
        scope,
        code: insert.error.code,
        message: insert.error.message,
      })
    }
  }

  return response
}

/**
 * Hash determinístico del body. JSON.stringify NO ordena keys, así que dos
 * objetos semánticamente iguales producen hashes distintos por orden de
 * propiedades. Normalizamos ordenando recursivamente.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** Util opcional para scripts/tests server-side. El navegador usa `crypto.randomUUID()`. */
export function newIdempotencyKey(): string {
  return randomUUID()
}
