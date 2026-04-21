'use client'
import { Icon } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import { useInstallPrompt } from '../hooks/use-install-prompt'

const STORAGE_KEY = 'tindivo.install-prompt.dismissed'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

/**
 * Banner flotante que invita a instalar la PWA.
 *
 * - Android/Chrome: dispara el prompt nativo `beforeinstallprompt`.
 * - iOS Safari: muestra instrucciones "Compartir → Añadir a pantalla de inicio".
 * - El usuario puede dismiss; se recuerda en localStorage por 7 días.
 */
export function InstallPromptBanner() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true) // start hidden until we check storage
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIos(isIOS())
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const { at } = JSON.parse(raw) as { at: number }
        const ageDays = (Date.now() - at) / (1000 * 60 * 60 * 24)
        setDismissed(ageDays < 7)
        return
      }
      setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }))
    } catch {
      /* storage bloqueado: noop */
    }
  }

  if (isInstalled || dismissed) return null
  if (!canInstall && !ios) return null // Chrome no ha disparado el evento y no es iOS

  return (
    <div
      role="dialog"
      aria-label="Instalar Tindivo"
      className="fixed left-3 right-3 z-[60]"
      style={{
        bottom: 'calc(100px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: '22px',
          background:
            'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)',
          color: '#ffffff',
          boxShadow: '0 16px 40px -12px rgba(255, 107, 53, 0.55)',
          padding: '14px 14px 14px 16px',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Icon name="install_mobile" size={22} filled />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm" style={{ letterSpacing: '-0.01em' }}>
              Instala Tindivo
            </div>
            <div className="text-[11px] opacity-90 leading-snug">
              {ios
                ? 'Toca Compartir → Añadir a pantalla de inicio'
                : 'Un toque para instalarla en tu teléfono'}
            </div>
          </div>
          {!ios && (
            <button
              type="button"
              onClick={async () => {
                const outcome = await promptInstall()
                if (outcome === 'accepted' || outcome === 'dismissed') dismiss()
              }}
              className="shrink-0 text-[11px] font-bold tracking-wider uppercase px-3 py-2 rounded-full transition active:scale-95"
              style={{
                background: '#ffffff',
                color: '#AB3500',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="shrink-0 inline-flex items-center justify-center transition active:scale-90"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
