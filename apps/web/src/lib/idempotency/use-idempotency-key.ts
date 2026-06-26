'use client'
import { useCallback, useRef } from 'react'

/**
 * Genera y mantiene un UUID v4 estable para deduplicar POSTs (patrón Stripe).
 *
 * Uso típico en formularios con TanStack Query:
 *
 *   const idem = useIdempotencyKey('new-order')
 *   const mutation = useMutation({
 *     mutationFn: (body) => api.createOrder(body, { idempotencyKey: idem.key }),
 *     onSuccess: () => idem.consume(),       // genera key nueva para próximo intento
 *     onError: (e) => { if (e.status >= 400 && e.status < 500) idem.consume() },
 *   })
 *
 * La key se persiste en sessionStorage por `formId` para sobrevivir recargas
 * accidentales de la pestaña mientras la mutation está en vuelo. Se descarta
 * tras 2xx/4xx (respuesta final del servidor). NO se descarta tras 5xx — el
 * cliente debe reintentar con la misma key (server cachea solo respuestas <500).
 *
 * `formId` debe ser único por formulario en la app: dos formularios distintos
 * no deben compartir la misma key (semántica diferente). Ej: 'new-order',
 * 'checkout', 'register-business'.
 */
export function useIdempotencyKey(formId: string): {
  key: string
  consume: () => void
} {
  const ref = useRef<string | null>(null)

  if (ref.current === null) {
    if (typeof window !== 'undefined') {
      const cached = window.sessionStorage.getItem(storageKey(formId))
      if (cached) {
        ref.current = cached
      } else {
        ref.current = generateUUID()
        window.sessionStorage.setItem(storageKey(formId), ref.current)
      }
    } else {
      // SSR: dummy key, nunca se enviará al servidor desde el render del server.
      ref.current = ''
    }
  }

  const consume = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey(formId))
    }
    // El próximo render generará una key nueva al detectar ref.current = null.
    ref.current = null
  }, [formId])

  return { key: ref.current ?? '', consume }
}

function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function storageKey(formId: string): string {
  return `tindivo:idem:${formId}`
}
