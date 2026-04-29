'use client'
import { Button, Icon } from '@tindivo/ui'

type Props = {
  remainingLabel: string
  isPending: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal de confirmación que aparece cuando el driver presiona "Ya recogí
 * el pedido" ANTES de que `estimated_ready_at` haya pasado. Si ya pasó,
 * el flujo confirma directamente sin abrir este modal — evita fricción en
 * el camino feliz y solo pregunta cuando hay riesgo de marcar pickup
 * prematuro.
 */
export function ConfirmPickupModal({
  remainingLabel,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: Props) {
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
            <Icon name="warning" size={24} filled />
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Quedan {remainingLabel}
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5">
              ¿Ya tienes el pedido en las manos?
            </h3>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant mb-5">
          El tiempo de preparación todavía no termina. Confirma solo si el restaurante ya te entregó
          la comida y estás listo para partir hacia el cliente.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full" disabled={isPending} onClick={onConfirm}>
            <Icon name="delivery_dining" size={20} filled />
            {isPending ? 'Confirmando...' : 'Sí, ya lo tengo, partir'}
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
