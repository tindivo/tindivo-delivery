'use client'
import { Button, Icon } from '@tindivo/ui'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tindivo-maintenance-dismissed-v1'

export function MaintenancePopup() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    setOpen(true)
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* sessionStorage puede estar bloqueada en algunos browsers */
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 backdrop-blur-sm p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-amber-100 text-amber-700">
            <Icon name="construction" size={24} filled />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">
              Aviso
            </p>
            <h2
              id="maintenance-title"
              className="mt-1 font-black text-lg text-on-surface leading-tight"
            >
              Tindivo está en mantenimiento
            </h2>
            <p className="mt-2 text-sm font-semibold text-on-surface-variant">
              Estamos ajustando la plataforma. Puedes navegar el catálogo, pero los pedidos
              pueden tardar más de lo habitual o no completarse. Te avisaremos cuando todo
              vuelva a la normalidad.
            </p>
          </div>
        </div>
        <Button onClick={dismiss} className="mt-5 w-full rounded-[20px]" size="md">
          Entendido
        </Button>
      </div>
    </div>
  )
}
