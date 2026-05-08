'use client'
import { useEffect, useState } from 'react'

/**
 * Hook que devuelve la fecha actual y se refresca cada `intervalMs`.
 *
 * Default 1s — los countdowns visibles del dominio (UrgencyBadge,
 * ElapsedTimer) muestran segundos, así que la granularidad debe permitir
 * transición fluida. Si un consumer no necesita tanta precisión (ej. un
 * banner amarillo→rojo cada 10s) puede pasar `useNow(10_000)` explícito.
 */
export function useNow(intervalMs = 1_000): Date {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
