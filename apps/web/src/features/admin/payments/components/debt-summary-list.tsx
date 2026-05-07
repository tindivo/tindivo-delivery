'use client'
import { Button, ColorDot, Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import { useAdminDebtSummary } from '../hooks/use-admin-payments'
import { RegisterPaymentSheet } from './register-payment-sheet'

type SelectedRestaurant = {
  id: string
  name: string
  accentColor: string
  balanceDue: number
}

export function DebtSummaryList() {
  const { data, isLoading } = useAdminDebtSummary()
  const [selected, setSelected] = useState<SelectedRestaurant | null>(null)

  const items = (data?.items ?? []).filter((r) => r.balanceDue > 0)
  const totalDebt = data?.totalDebt ?? 0

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-container text-on-primary p-6 shadow-[0_8px_28px_-12px_rgba(171,53,0,0.35)]">
        <div className="text-[11px] font-bold tracking-[0.22em] uppercase opacity-80">
          Deuda total acumulada
        </div>
        <div className="font-black text-4xl mt-1">S/ {totalDebt.toFixed(2)}</div>
        <div className="text-xs opacity-90 mt-1">
          {items.length} {items.length === 1 ? 'restaurante' : 'restaurantes'} con deuda activa
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-surface-container-lowest border border-outline-variant/15">
          <Icon name="task_alt" size={32} className="text-emerald-600" />
          <p className="mt-3 text-on-surface-variant">
            Todos los restaurantes están al día. Sin deudas pendientes.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li
              key={r.restaurantId}
              className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 p-4"
            >
              <ColorDot color={r.accentColor} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-on-surface truncate">{r.restaurantName}</div>
                <div className="text-xs text-on-surface-variant mt-0.5">
                  {r.isActive ? 'Activo' : 'Inactivo'}
                  {r.yapeNumber ? ` · Yape +51 ${r.yapeNumber}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-lg text-on-surface">
                  S/ {r.balanceDue.toFixed(2)}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  setSelected({
                    id: r.restaurantId,
                    name: r.restaurantName,
                    accentColor: r.accentColor,
                    balanceDue: r.balanceDue,
                  })
                }
              >
                <Icon name="add" size={16} />
                Liquidar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <RegisterPaymentSheet
          restaurantId={selected.id}
          restaurantName={selected.name}
          accentColor={selected.accentColor}
          balanceDue={selected.balanceDue}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
