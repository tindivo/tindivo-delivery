'use client'
import { Icon } from '@tindivo/ui'
import { useEffect } from 'react'

export function MaintenanceOverlay() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevTouch = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    function blockEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('keydown', blockEscape, true)

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouch
      window.removeEventListener('keydown', blockEscape, true)
    }
  }, [])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-body"
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{
        zIndex: 9999,
        background:
          'radial-gradient(120% 120% at 50% 0%, rgba(255, 140, 66, 0.35) 0%, rgba(171, 53, 0, 0.55) 45%, rgba(60, 18, 0, 0.92) 100%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden text-center"
        style={{
          borderRadius: '32px',
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.55)',
          padding: '40px 28px 32px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div aria-hidden="true" className="customer-subtle-grid absolute inset-0 opacity-20" />

        <div className="relative flex flex-col items-center gap-6">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)',
              color: '#ffffff',
              boxShadow: '0 18px 40px -12px rgba(255, 107, 53, 0.6)',
            }}
          >
            <Icon name="construction" size={44} filled />
          </span>

          <div className="flex flex-col gap-3">
            <span
              className="inline-flex self-center items-center gap-1 px-3 py-1 text-xs font-bold uppercase"
              style={{
                borderRadius: '999px',
                background: 'rgba(171, 53, 0, 0.1)',
                color: '#AB3500',
              }}
            >
              <Icon name="bolt" size={14} filled />
              En mantenimiento
            </span>
            <h1
              id="maintenance-title"
              className="text-[26px] font-black leading-tight"
              style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}
            >
              Estamos preparando algo
              <br />
              delicioso para ti
            </h1>
            <p
              id="maintenance-body"
              className="text-[15px] leading-relaxed"
              style={{ color: '#4a4a4a' }}
            >
              Tindivo está en mantenimiento por unas horas. Muy pronto vas a poder pedir tu comida
              favorita en San Jacinto desde aquí.
            </p>
          </div>

          <div
            className="w-full flex flex-col gap-3"
            style={{
              padding: '16px 18px',
              borderRadius: '20px',
              background: 'rgba(255, 246, 240, 0.9)',
              border: '1px solid rgba(255, 140, 66, 0.25)',
            }}
          >
            <div className="flex items-start gap-3 text-left">
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '12px',
                  background: 'rgba(255, 107, 53, 0.15)',
                  color: '#AB3500',
                }}
              >
                <Icon name="restaurant" size={18} filled />
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-bold" style={{ color: '#1a1a1a' }}>
                  Pedidos pausados
                </div>
                <div className="text-[12px]" style={{ color: '#6a6a6a' }}>
                  Volveremos a recibir órdenes en breve.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '12px',
                  background: 'rgba(255, 107, 53, 0.15)',
                  color: '#AB3500',
                }}
              >
                <Icon name="schedule" size={18} filled />
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-bold" style={{ color: '#1a1a1a' }}>
                  Gracias por tu paciencia
                </div>
                <div className="text-[12px]" style={{ color: '#6a6a6a' }}>
                  Estamos mejorando la experiencia para ti.
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase" style={{ color: '#AB3500' }}>
            Tindivo · San Jacinto
          </div>
        </div>
      </div>
    </div>
  )
}
