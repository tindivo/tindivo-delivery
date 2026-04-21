'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type State = {
  canInstall: boolean
  isInstalled: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

/**
 * Hook para detectar si la PWA es instalable y disparar el prompt.
 *
 * En Chrome/Edge/Samsung Internet: `beforeinstallprompt` dispara automático
 * cuando se cumplen los criterios (manifest + SW + engagement).
 * En iOS Safari: no hay prompt programático — el usuario debe tocar "Compartir
 * → Añadir a pantalla de inicio" manualmente. Exponemos `canInstall=false` pero
 * el componente wrapper puede detectar iOS y mostrar instrucciones.
 */
export function useInstallPrompt(): State {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detectar si ya está en modo standalone (PWA instalada)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsInstalled(isStandalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    async promptInstall() {
      if (!deferredPrompt) return 'unavailable'
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return outcome
    },
  }
}
