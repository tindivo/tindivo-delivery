'use client'
import { useCallback, useRef } from 'react'

/**
 * Genera y mantiene un UUID v4 estable para deduplicar POSTs (patrón Stripe).
 *
 * Uso típico en formularios con TanStack Query:
 *
 *   const idem = useIdempotencyKey('checkout')
 *   const mutation = useMutation({
 *     mutationFn: (body) => api.createOrder(body, { idempotencyKey: idem.key }),
 *     onSuccess: () => idem.consume(),
 *     onError: (e) => { if (e.status >= 400 && e.status < 500) idem.consume() },
 *   })
 *
 * La key se persiste en sessionStorage por `formId` para sobrevivir recargas
 * accidentales mientras la mutation está en vuelo. Se descarta tras 2xx/4xx;
 * NO tras 5xx (permite retry seguro con misma key — el server solo cachea <500).
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
        ref.current = window.crypto.randomUUID()
        window.sessionStorage.setItem(storageKey(formId), ref.current)
      }
    } else {
      ref.current = ''
    }
  }

  const consume = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(storageKey(formId))
    }
    ref.current = null
  }, [formId])

  return { key: ref.current ?? '', consume }
}

function storageKey(formId: string): string {
  return `tindivo:idem:${formId}`
}
