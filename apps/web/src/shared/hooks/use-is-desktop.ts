'use client'
import { useEffect, useState } from 'react'

/**
 * Hook que detecta si el dispositivo tiene cursor preciso (mouse o trackpad
 * con hover real) — típicamente PC/laptop. Útil para habilitar controles que
 * requieren mouse (botones laterales de scroll, hover states) sin interferir
 * con la experiencia táctil en móviles.
 *
 * SSR-safe: inicializa en `false` y se actualiza tras hidratación.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
