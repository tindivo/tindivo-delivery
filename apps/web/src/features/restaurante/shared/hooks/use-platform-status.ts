'use client'
import { platform } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Estado del horario operativo. Refetch cada 60s para reaccionar al cambio
 * de ventana sin recargar la página. Fail-open: si la query falla, el hook
 * asume isOpen=true (la regla dura vive en el backend que rechaza con 403
 * si se intenta crear un pedido fuera de ventana).
 */
export function usePlatformStatus() {
  return useQuery({
    queryKey: ['platform-status'],
    queryFn: () => platform.getStatus(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

/**
 * Formato amigable para el banner: "hoy a las 18:00" / "mañana lunes a las 18:00".
 */
export function formatNextOpenLabel(nextOpenIso: string | null, now: Date = new Date()): string {
  if (!nextOpenIso) return ''
  const next = new Date(nextOpenIso)
  const fmtDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayYmd = fmtDate.format(now)
  const nextYmd = fmtDate.format(next)
  const diffDays = daysBetweenLima(todayYmd, nextYmd)
  const time = next.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
  })
  if (diffDays === 0) return `hoy a las ${time}`
  if (diffDays === 1) {
    const weekday = next.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'long',
    })
    return `mañana ${weekday} a las ${time}`
  }
  const weekday = next.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
  })
  return `el ${weekday} a las ${time}`
}

function daysBetweenLima(todayYmd: string, futureYmd: string): number {
  const t = new Date(`${todayYmd}T12:00:00-05:00`).getTime()
  const f = new Date(`${futureYmd}T12:00:00-05:00`).getTime()
  return Math.round((f - t) / (24 * 3600 * 1000))
}
