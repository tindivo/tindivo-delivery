'use client'
import { Icon } from '@tindivo/ui'
import { useEffect } from 'react'

export function MaintenancePopup() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-amber-100 text-amber-700">
            <Icon name="construction" size={24} filled />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Aviso</p>
            <h2
              id="maintenance-title"
              className="mt-1 font-black text-lg text-on-surface leading-tight"
            >
              Tindivo está en mantenimiento
            </h2>
            <p className="mt-2 text-sm font-semibold text-on-surface-variant">
              Estamos ajustando la plataforma. Por ahora no es posible navegar el catálogo ni hacer
              pedidos. Vuelve a intentarlo más tarde — te avisaremos cuando todo esté disponible
              nuevamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
