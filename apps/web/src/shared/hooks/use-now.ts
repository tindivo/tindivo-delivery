'use client'
import { useEffect, useState } from 'react'

/**
 * Hook que devuelve la fecha actual y se refresca cada `intervalMs`.
 *
 * Pensado para componentes con countdown (OrderCard, UrgencyBadge) — 30s
 * es granularidad suficiente para que un pedido cruce de amarillo a rojo
 * sin necesidad de refetch.
 */
export function useNow(intervalMs: number = 30_000): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
