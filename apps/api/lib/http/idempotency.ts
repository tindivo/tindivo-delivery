import { createHash, randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorCodes } from '@tindivo/contracts'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { problemCode } from './problem'

/**
 * Wrapper de idempotencia tipo Stripe para endpoints POST de creacion.
 *
 * Implementa el patron claim-with-placeholder atomico:
 * 1. `claim_idempotency_key` hace INSERT ON CONFLICT DO NOTHING. La PK
 *    compuesta (key, scope) actua como mutex: exactamente un caller gana.
 * 2. El ganador ejecuta el handler y llama `finalize_idempotency_key`.
 * 3. Los perdedores reciben:
 *    - 'cached'    -> respuesta lista, devolverla.
 *    - 'in_flight' -> polling hasta que el ganador finalice (max 30s).
 *    - 'mismatch'  -> 409 (mismo key con body distinto).
 *
 * Esto reemplaza el flujo previo SELECT->handler->INSERT, que tenia un
 * TOCTOU race condition: dos requests paralelos veian cache vacio entre
 * SELECT y handler, ejecutando ambos y creando recursos duplicados.
 *
 * Comportamiento:
 * - Sin header `Idempotency-Key`           -> ejecuta handler tal cual (back-compat).
 * - Header invalido (no UUID v4)           -> 400 VALIDATION_ERROR.
 * - Key+scope existe, body coincide        -> devuelve respuesta cacheada.
 * - Key+scope existe, body distinto        -> 409 IDEMPOTENCY_KEY_MISMATCH.
 * - Key nueva                              -> ejecuta handler, cachea solo si status<500.
 *
 * Las 5xx NO se cachean: el placeholder se borra (`release`) para que el
 * cliente pueda reintentar con la misma key tras un fallo transitorio.
 *
 * El `scope` evita colisiones entre endpoints distintos.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Polling de in-flight: 150ms x 200 iteraciones = 30s max wait.
// El handler tipico de creacion de pedido tarda 200-800ms, asi que el polling
// converge casi siempre en la primera o segunda iteracion.
const IN_FLIGHT_POLL_INTERVAL_MS = 150
const IN_FLIGHT_POLL_MAX_ITERATIONS = 200

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

  const { data: claimRows, error: claimErr } = await admin.rpc('claim_idempotency_key', {
    p_key: key,
    p_scope: scope,
    p_request_hash: requestHash,
  })

  if (claimErr || !claimRows || claimRows.length === 0) {
    // Falla del RPC mismo (no del handler): degrade graceful ejecutando el
    // handler sin idempotencia en vez de tirar el endpoint completo. Un fallo
    // de Supabase aqui es muy raro pero no debe bloquear pedidos.
    console.warn('[idempotency] claim rpc failed, bypassing', {
      scope,
      error: claimErr?.message,
    })
    return handler()
  }

  const claim = claimRows[0] as { outcome: string; cached_status: number; cached_body: unknown }

  if (claim.outcome === 'mismatch') {
    console.warn('[idempotency] body mismatch', { scope })
    return problemCode(
      'IDEMPOTENCY_KEY_MISMATCH',
      409,
      'Esta Idempotency-Key fue usada con un body diferente',
    )
  }

  if (claim.outcome === 'cached') {
    return NextResponse.json(claim.cached_body, { status: claim.cached_status })
  }

  if (claim.outcome === 'in_flight') {
    const started = Date.now()
    for (let i = 0; i < IN_FLIGHT_POLL_MAX_ITERATIONS; i++) {
      await sleep(IN_FLIGHT_POLL_INTERVAL_MS)
      const { data } = await admin
        .from('idempotency_keys')
        .select('response_status, response_body')
        .eq('key', key)
        .eq('scope', scope)
        .maybeSingle()

      if (data && data.response_status > 0) {
        console.info('[idempotency] in_flight resolved', {
          scope,
          waitedMs: Date.now() - started,
        })
        return NextResponse.json(data.response_body, { status: data.response_status })
      }
      // response_status === 0 sigue in-flight; o data === null si el
      // ganador hizo release (5xx). En ambos casos seguimos polleando.
      // Si fue release, el siguiente iter veremos null persistente y
      // saldremos por timeout. Acepable: las 5xx son raras y el cliente
      // ya tiene una key consumible (esta) que puede reusar.
    }
    console.warn('[idempotency] in_flight timeout', { scope, waitedMs: Date.now() - started })
    return problemCode('IDEMPOTENCY_TIMEOUT', 504, 'Otra request con la misma key sigue en curso')
  }

  // outcome === 'reserved': somos el ganador, ejecutamos el handler.
  let response: NextResponse
  try {
    response = await handler()
  } catch (err) {
    // El handler lanzo. Liberamos el placeholder para que un retry con la
    // misma key pueda ejecutarse de nuevo. Sin esto, la key queda bloqueada
    // hasta el cleanup automatico de 5min de claim_idempotency_key.
    await releaseQuietly(admin, key, scope)
    throw err
  }

  if (response.status >= 500) {
    // 5xx: error transitorio. Liberar placeholder para permitir retry seguro.
    await releaseQuietly(admin, key, scope)
    return response
  }

  // Status < 500: cachear respuesta final via UPDATE del placeholder.
  let responseBody: unknown = null
  try {
    // clone() para no consumir el body que Next.js todavia debe enviar al cliente.
    responseBody = await response
      .clone()
      .json()
      .catch(() => null)
  } catch {
    // Respuesta sin JSON parseable (204, etc.) -> cacheamos {}.
  }

  const { error: finalizeErr } = await admin.rpc('finalize_idempotency_key', {
    p_key: key,
    p_scope: scope,
    p_response_status: response.status,
    // biome-ignore lint/suspicious/noExplicitAny: Json type del RPC acepta cualquier valor serializable.
    p_response_body: (responseBody ?? {}) as any,
  })

  if (finalizeErr) {
    console.warn('[idempotency] finalize failed', {
      scope,
      code: finalizeErr.code,
      message: finalizeErr.message,
    })
    // No bloqueamos la respuesta al cliente por esto. El placeholder seguira
    // como in_flight y el cleanup de 5min lo limpiara. Peor caso: el siguiente
    // request con la misma key ejecuta de nuevo.
  }

  return response
}

async function releaseQuietly(admin: SupabaseClient, key: string, scope: string): Promise<void> {
  const { error } = await admin.rpc('release_idempotency_key', { p_key: key, p_scope: scope })
  if (error) {
    console.warn('[idempotency] release failed', {
      scope,
      code: error.code,
      message: error.message,
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Hash deterministico del body. JSON.stringify NO ordena keys, asi que dos
 * objetos semanticamente iguales producen hashes distintos por orden de
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
