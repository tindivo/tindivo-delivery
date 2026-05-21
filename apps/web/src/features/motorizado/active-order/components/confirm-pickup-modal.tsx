'use client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon } from '@tindivo/ui'
import { useState } from 'react'

type DistanceBand = Orders.DeliveryDistanceBand

type Props = {
  remainingLabel: string
  isPending: boolean
  errorMessage: string | null
  /** Cap configurado por admin desde assignment_rules. Default 3. */
  maxSlots?: number
  /** Si true, advertimos que aún no terminó el prep (warning de pickup prematuro). */
  prepNotReady?: boolean
  onConfirm: (input: { occupancySlots: number; deliveryDistanceBand: DistanceBand }) => void
  onCancel: () => void
}

/**
 * Modal de confirmación de pickup con 2 inputs requeridos:
 *   1) `occupancySlots`: cuántos slots ocupa el pedido en la mochila del driver
 *      (1..N, default 1, max configurable). Alimenta R3 (cap por suma de slots).
 *   2) `deliveryDistanceBand`: qué tan lejos está la entrega del local
 *      (near/medium/far). Tindivo cobra comisiones diferenciadas — el driver
 *      lo declara honestamente.
 *
 * El botón "Confirmar" queda disabled hasta que el driver elige ambos.
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
  const [distance, setDistance] = useState<DistanceBand | null>(null)
  const safeMax = Math.max(1, Math.min(10, maxSlots))
  const slotOptions = Array.from({ length: safeMax }, (_, i) => i + 1)
  const canConfirm = !isPending && slots >= 1 && distance !== null

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
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6 max-h-[92vh] overflow-y-auto"
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
              Antes de partir con el pedido
            </h3>
          </div>
        </div>

        {/* PREGUNTA 1: Ocupación en mochila */}
        <div className="mb-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1.5">
            1 · Ocupación en mochila
          </div>
          <p className="text-xs text-on-surface-variant mb-3">
            Un pedido normal cabe en 1 slot. Pedidos grandes (combos familiares, bebidas) pueden
            ocupar más.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {slotOptions.map((n) => {
              const isSelected = slots === n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSlots(n)}
                  disabled={isPending}
                  aria-pressed={isSelected}
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
        </div>

        {/* Divider sutil entre las dos preguntas */}
        <div className="h-px bg-outline-variant/30 mb-5" aria-hidden="true" />

        {/* PREGUNTA 2: Distancia a la entrega */}
        <div className="mb-5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1.5">
            2 · ¿Qué tan lejos está la entrega?
          </div>
          <p className="text-xs text-on-surface-variant mb-3">
            Sirve para calcular la comisión del restaurante. Sé honesto.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <DistanceButton
              value="near"
              label="Cerca"
              icon="near_me"
              ariaLabel="Entrega cerca"
              selected={distance === 'near'}
              disabled={isPending}
              onSelect={setDistance}
            />
            <DistanceButton
              value="medium"
              label="Medio"
              icon="social_distance"
              ariaLabel="Entrega medio lejos"
              selected={distance === 'medium'}
              disabled={isPending}
              onSelect={setDistance}
            />
            <DistanceButton
              value="far"
              label="Lejos"
              icon="route"
              ariaLabel="Entrega lejos"
              selected={distance === 'far'}
              disabled={isPending}
              onSelect={setDistance}
            />
          </div>
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
            disabled={!canConfirm}
            onClick={() => {
              if (!distance) return
              onConfirm({ occupancySlots: slots, deliveryDistanceBand: distance })
            }}
          >
            <Icon name="delivery_dining" size={20} filled />
            {isPending
              ? 'Confirmando...'
              : distance === null
                ? 'Falta elegir distancia'
                : 'Sí, partir con el pedido'}
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

type DistanceButtonProps = {
  value: DistanceBand
  label: string
  icon: string
  ariaLabel: string
  selected: boolean
  disabled: boolean
  onSelect: (value: DistanceBand) => void
}

function DistanceButton({
  value,
  label,
  icon,
  ariaLabel,
  selected,
  disabled,
  onSelect,
}: DistanceButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className="relative h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] disabled:opacity-60"
      style={{
        background: selected
          ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
          : 'var(--mat-sys-surface-container-low, #f6f3f0)',
        color: selected ? '#ffffff' : 'var(--mat-sys-on-surface, #1f1b16)',
        borderColor: selected ? '#0284C7' : 'rgba(0,0,0,0.08)',
        boxShadow: selected ? '0 8px 20px -8px rgba(14,165,233,0.5)' : 'none',
      }}
    >
      <Icon name={icon} size={24} filled />
      <span
        className="text-[10px] font-black tracking-[0.18em] uppercase"
        style={{
          color: selected ? '#ffffff' : 'var(--mat-sys-on-surface-variant, #5c554f)',
        }}
      >
        {label}
      </span>
    </button>
  )
}
