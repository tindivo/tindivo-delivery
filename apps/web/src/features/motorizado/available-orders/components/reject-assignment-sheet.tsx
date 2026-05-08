'use client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon } from '@tindivo/ui'
import { useState } from 'react'

type Props = {
  isPending: boolean
  errorMessage: string | null
  onConfirm: (reason: Orders.RejectionReason) => void
  onCancel: () => void
}

const REASONS: ReadonlyArray<{
  value: Orders.RejectionReason
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'too_far',
    label: 'Muy lejos',
    description: 'La distancia no me conviene ahora.',
    icon: 'social_distance',
  },
  {
    value: 'backpack_full',
    label: 'Mochila llena',
    description: 'No me cabe otro pedido en este viaje.',
    icon: 'inventory_2',
  },
  {
    value: 'not_convenient',
    label: 'No me conviene',
    description: 'Prefiero no tomarlo en este momento.',
    icon: 'do_not_disturb_on',
  },
  {
    value: 'mechanical_issue',
    label: 'Problema con la moto',
    description: 'Estoy con un inconveniente mecánico.',
    icon: 'two_wheeler',
  },
  {
    value: 'other',
    label: 'Otro motivo',
    description: 'Ninguna de las anteriores.',
    icon: 'help',
  },
]

/**
 * Bottom-sheet que aparece cuando el driver presiona "Rechazar" en un pedido
 * asignado por AutoAssign. La razón es obligatoria pero pre-definida (lista
 * cerrada en `REJECTION_REASONS`) para mantener señales analíticas limpias.
 */
export function RejectAssignmentSheet({ isPending, errorMessage, onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<Orders.RejectionReason | null>(null)

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Rechazar asignación"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCancel}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />
      <div
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6"
        style={{ boxShadow: '0 -16px 40px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <span
            className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #BA1A1A 0%, #991B1B 100%)',
              color: '#ffffff',
            }}
          >
            <Icon name="cancel" size={24} filled />
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Rechazar pedido
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5">¿Por qué no puedes tomarlo?</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              El pedido volverá a la cola y se reasignará a otro motorizado.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 mb-4 max-h-[50vh] overflow-y-auto">
          {REASONS.map((reason) => {
            const isSelected = selected === reason.value
            return (
              <li key={reason.value}>
                <button
                  type="button"
                  onClick={() => setSelected(reason.value)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: isSelected
                      ? 'rgba(186, 26, 26, 0.08)'
                      : 'var(--mat-sys-surface-container-low, #f6f3f0)',
                    borderColor: isSelected ? '#BA1A1A' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{
                      background: isSelected ? '#BA1A1A' : 'rgba(0,0,0,0.05)',
                      color: isSelected ? '#ffffff' : 'var(--mat-sys-on-surface-variant, #5c554f)',
                    }}
                  >
                    <Icon name={reason.icon} size={20} filled={isSelected} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{reason.label}</div>
                    <div className="text-xs text-on-surface-variant truncate">
                      {reason.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Icon name="check_circle" size={20} filled className="text-red-700" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            disabled={isPending || !selected}
            onClick={() => selected && onConfirm(selected)}
            style={{
              background: 'linear-gradient(135deg, #BA1A1A 0%, #991B1B 100%)',
            }}
          >
            <Icon name="cancel" size={20} filled />
            {isPending ? 'Rechazando...' : 'Confirmar rechazo'}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-bold tracking-wide active:scale-95 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </dialog>
  )
}
