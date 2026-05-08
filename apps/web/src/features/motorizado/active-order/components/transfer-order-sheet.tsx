'use client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import { useDriverPeers } from '../hooks/use-driver-peers'

type Props = {
  restaurantId: string
  isPending: boolean
  errorMessage: string | null
  onConfirm: (toDriverId: string, reason: Orders.TransferReason) => void
  onCancel: () => void
}

const REASONS: ReadonlyArray<{
  value: Orders.TransferReason
  label: string
  description: string
  icon: string
}> = [
  {
    value: 'accident',
    label: 'Tuve un accidente',
    description: 'No puedo continuar con la entrega.',
    icon: 'crisis_alert',
  },
  {
    value: 'mechanical_issue',
    label: 'Moto descompuesta',
    description: 'Problema mecánico que impide continuar.',
    icon: 'build',
  },
  {
    value: 'personal_emergency',
    label: 'Emergencia personal',
    description: 'Tengo que retirarme urgentemente.',
    icon: 'medical_services',
  },
  {
    value: 'other',
    label: 'Otro motivo',
    description: 'Ninguna de las anteriores.',
    icon: 'help',
  },
]

const VEHICLE_LABEL: Record<string, string> = {
  moto: 'Moto',
  bicicleta: 'Bicicleta',
  pie: 'A pie',
  auto: 'Auto',
}

/**
 * Bottom-sheet para transferir un pedido activo a otro motorizado del mismo
 * restaurante. Casos: accidente, moto descompuesta, emergencia personal.
 *
 * El backend filtra los compañeros para incluir solo los que tengan espacio
 * en mochila — si la lista llega vacía mostramos un empty state pidiendo
 * llamar al admin.
 */
export function TransferOrderSheet({
  restaurantId,
  isPending,
  errorMessage,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState<Orders.TransferReason | null>(null)
  const [toDriverId, setToDriverId] = useState<string | null>(null)
  const peersQuery = useDriverPeers(restaurantId, true)
  const peers = peersQuery.data?.items ?? []

  const ready = !!reason && !!toDriverId

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Transferir pedido"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCancel}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />
      <div
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-6 max-h-[90vh] overflow-y-auto"
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
            <Icon name="swap_horiz" size={24} filled />
          </span>
          <div className="flex-1">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Pasar pedido
            </div>
            <h3 className="font-black text-lg leading-tight mt-0.5">
              ¿Por qué no puedes continuar?
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Solo en casos excepcionales. El compañero recibirá una notificación.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 mb-5">
          {REASONS.map((r) => {
            const isSelected = reason === r.value
            return (
              <li key={r.value}>
                <button
                  type="button"
                  onClick={() => setReason(r.value)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: isSelected
                      ? 'rgba(255, 107, 53, 0.08)'
                      : 'var(--mat-sys-surface-container-low, #f6f3f0)',
                    borderColor: isSelected ? '#FF6B35' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{
                      background: isSelected ? '#FF6B35' : 'rgba(0,0,0,0.05)',
                      color: isSelected ? '#ffffff' : 'var(--mat-sys-on-surface-variant, #5c554f)',
                    }}
                  >
                    <Icon name={r.icon} size={20} filled={isSelected} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{r.label}</div>
                    <div className="text-xs text-on-surface-variant truncate">{r.description}</div>
                  </div>
                  {isSelected && (
                    <Icon name="check_circle" size={20} filled className="text-[#FF6B35]" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
            Pasar a
          </span>
          {peers.length > 0 && (
            <span className="text-[10px] text-on-surface-variant">
              ({peers.length} {peers.length === 1 ? 'disponible' : 'disponibles'})
            </span>
          )}
        </div>

        {peersQuery.isLoading ? (
          <div className="space-y-2 mb-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : peers.length === 0 ? (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <Icon name="warning" size={18} className="text-amber-700 mt-0.5" filled />
              <div>
                <div className="font-bold mb-1">No hay compañeros disponibles ahora</div>
                <div>
                  Llama al admin Tindivo para coordinar manualmente la entrega: <strong>906550166</strong>.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 mb-4 max-h-[35vh] overflow-y-auto">
            {peers.map((peer) => {
              const isSelected = toDriverId === peer.driverId
              const usedSlots = peer.activeSlots + peer.reservedSlots
              return (
                <li key={peer.driverId}>
                  <button
                    type="button"
                    onClick={() => setToDriverId(peer.driverId)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: isSelected
                        ? 'rgba(255, 107, 53, 0.08)'
                        : 'var(--mat-sys-surface-container-low, #f6f3f0)',
                      borderColor: isSelected ? '#FF6B35' : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    <span
                      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        background: isSelected ? '#FF6B35' : 'rgba(0,0,0,0.05)',
                        color: isSelected ? '#ffffff' : 'var(--mat-sys-on-surface-variant, #5c554f)',
                      }}
                    >
                      <Icon name="two_wheeler" size={20} filled={isSelected} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{peer.fullName}</div>
                      <div className="text-xs text-on-surface-variant">
                        {VEHICLE_LABEL[peer.vehicleType] ?? peer.vehicleType} · {usedSlots} slots ocupados
                      </div>
                    </div>
                    {isSelected && (
                      <Icon name="check_circle" size={20} filled className="text-[#FF6B35]" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
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
            disabled={isPending || !ready}
            onClick={() => {
              if (reason && toDriverId) onConfirm(toDriverId, reason)
            }}
          >
            <Icon name="swap_horiz" size={20} filled />
            {isPending ? 'Transfiriendo...' : 'Transferir pedido'}
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
