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
 * En iOS Safari: no hay prompt programático — el componente wrapper detecta
 * iOS y muestra instrucciones manuales.
 */
export function useInstallPrompt(): State {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

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
