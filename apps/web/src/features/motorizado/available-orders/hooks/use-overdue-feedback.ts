'use client'
import { useEffect, useRef } from 'react'

/**
 * Dispara beep + vibración cuando aparece un nuevo pedido en tier `overdue`
 * (zona roja). Complementa la push notification: la push solo llega con la
 * PWA en background; este hook da feedback audible cuando el driver ya tiene
 * la app abierta.
 *
 * Edge cases:
 *  - Solo alerta por orderIds que no se habían visto antes en overdue
 *    (evita repetir beep cada tick del countdown).
 *  - No alerta en el primer render (evita beep espurio al cargar con overdue
 *    preexistentes).
 *  - Ignora fallos de AudioContext (autoplay policy en iOS antes del primer
 *    user gesture): falla silenciosamente.
 */
export function useOverdueFeedback(overdueIds: Set<string>) {
  const seenRef = useRef<Set<string>>(new Set())
  const primedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!primedRef.current) {
      primedRef.current = true
      for (const id of overdueIds) seenRef.current.add(id)
      return
    }

    const fresh: string[] = []
    for (const id of overdueIds) {
      if (!seenRef.current.has(id)) fresh.push(id)
    }
    if (fresh.length === 0) return
    for (const id of fresh) seenRef.current.add(id)

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([400, 150, 400, 150, 400])
      }
    } catch {
      // iOS y algunos browsers no soportan vibrate — ignorar.
    }

    try {
      playAlertBeep()
    } catch {
      // Autoplay bloqueado hasta primer user gesture — ignorar.
    }
  }, [overdueIds])
}

/**
 * Beep doble estilo "alerta" usando Web Audio API. Sin assets binarios.
 */
function playAlertBeep(): void {
  const AudioCtor =
    (typeof window !== 'undefined' &&
      ((window.AudioContext as typeof AudioContext | undefined) ??
        // biome-ignore lint/suspicious/noExplicitAny: webkit vendor prefix
        ((window as any).webkitAudioContext as typeof AudioContext | undefined))) ||
    null
  if (!AudioCtor) return

  const ctx = new AudioCtor()
  const t0 = ctx.currentTime

  const tone = (startAt: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(0.25, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.05)
  }

  tone(t0, 880, 0.22)
  tone(t0 + 0.28, 1175, 0.3)

  window.setTimeout(() => {
    ctx.close().catch(() => null)
  }, 900)
}
