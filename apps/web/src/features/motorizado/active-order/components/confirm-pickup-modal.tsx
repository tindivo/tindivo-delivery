'use client'
import { Button, Icon } from '@tindivo/ui'
import { useState } from 'react'

type Props = {
  remainingLabel: string
  isPending: boolean
  errorMessage: string | null
  /** Cap configurado por admin desde assignment_rules. Default 3. */
  maxSlots?: number
  /** Si true, advertimos que aún no terminó el prep (warning de pickup prematuro). */
  prepNotReady?: boolean
  onConfirm: (occupancySlots: number) => void
  onCancel: () => void
}

/**
 * Modal de confirmación de pickup con stepper de "ocupación de mochila".
 *
 * El driver declara cuántos slots ocupa el pedido (default 1, max
 * configurable por admin). Esto alimenta R3: cap de pedidos por driver
 * pasa de "filas" a "suma de slots", así un pedido grande (slots=3)
 * llena la mochila por sí solo y bloquea nuevas asignaciones.
 *
 * Si `prepNotReady=true`, también advertimos que el prep aún no terminó
 * — antes este modal solo aparecía en ese caso, ahora aparece siempre.
 */
export function ConfirmPickupModal({
  remainingLabel,
  isPending,
  errorMessage,
  maxSlots = 3,
  prepNotReady = false,
  onConfirm,
  onCancel,
}: Props) {
  const [slots, setSlots] = useState(1)
  const safeMax = Math.max(1, Math.min(10, maxSlots))
  const options = Array.from({ length: safeMax }, (_, i) => i + 1)

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Confirmar recogida del pedido"
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
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
              color: '#ffffff',
            }}
          >
            <Icon name="inventory_2" size={24} filled />
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Confirmar pickup
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5">
              ¿Cuánto ocupa este pedido en tu mochila?
            </h3>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-4">
          Selecciona los slots que ocupa. Un pedido normal cabe en 1; pedidos grandes (combos
          familiares, varias bebidas) pueden ocupar más.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {options.map((n) => {
            const isSelected = slots === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setSlots(n)}
                disabled={isPending}
                className="relative h-20 rounded-2xl border font-black text-2xl transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                    : 'var(--mat-sys-surface-container-low, #f6f3f0)',
                  color: isSelected ? '#ffffff' : 'var(--mat-sys-on-surface, #1f1b16)',
                  borderColor: isSelected ? '#FF6B35' : 'rgba(0,0,0,0.08)',
                  boxShadow: isSelected ? '0 8px 20px -8px rgba(255,107,53,0.5)' : 'none',
                }}
              >
                <div>{n}</div>
                <div
                  className="text-[9px] font-bold tracking-[0.18em] uppercase opacity-80"
                  style={{
                    color: isSelected ? '#ffffff' : 'var(--mat-sys-on-surface-variant, #5c554f)',
                  }}
                >
                  {n === 1 ? 'slot' : 'slots'}
                </div>
              </button>
            )
          })}
        </div>

        {prepNotReady && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <Icon name="warning" size={18} className="text-amber-700 mt-0.5" filled />
            <div className="text-xs text-amber-900">
              El prep aún no termina (quedan {remainingLabel}). Confirma solo si el restaurante ya
              te entregó la comida.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={() => onConfirm(slots)}
          >
            <Icon name="delivery_dining" size={20} filled />
            {isPending ? 'Confirmando...' : 'Sí, partir con el pedido'}
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
