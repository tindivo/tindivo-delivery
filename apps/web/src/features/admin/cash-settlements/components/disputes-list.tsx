'use client'
import type { AdminCashSettlementRow, ResolveCashPayload } from '@tindivo/api-client'
import { Button, EmptyState, Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import {
  useAdminCashSettlements,
  useResolveCashSettlement,
} from '../hooks/use-admin-cash-settlements'

function money(n: number | string | null): string {
  const v = Number(n ?? 0)
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DisputesList() {
  const { data, isLoading } = useAdminCashSettlements('disputed')
  const [openResolveId, setOpenResolveId] = useState<string | null>(null)

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="bleed-text font-black text-3xl text-on-surface">Disputas de efectivo</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Casos donde el monto declarado por el driver y el recibido por el restaurante no
          coincidieron. Resuélvelos con justicia tras consultar a ambas partes.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Sin disputas abiertas"
          description="Cuando el restaurante y el driver no coinciden en el monto, aparecerán aquí para que decidas."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((s) => (
            <DisputeCard
              key={s.id}
              settlement={s}
              isOpen={openResolveId === s.id}
              onOpen={() => setOpenResolveId(s.id)}
              onClose={() => setOpenResolveId(null)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function DisputeCard({
  settlement,
  isOpen,
  onOpen,
  onClose,
}: {
  settlement: AdminCashSettlementRow
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const resolve = useResolveCashSettlement()

  const declared = Number(settlement.delivered_amount ?? 0)
  const reported = Number(settlement.reported_amount ?? 0)
  const diff = declared - reported

  const [decision, setDecision] = useState<ResolveCashPayload['decision']>('accept_restaurant')
  const [resolvedAmount, setResolvedAmount] = useState<string>(reported.toFixed(2))
  const [notes, setNotes] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function onDecisionChange(d: ResolveCashPayload['decision']) {
    setDecision(d)
    if (d === 'accept_driver') setResolvedAmount(declared.toFixed(2))
    else if (d === 'accept_restaurant') setResolvedAmount(reported.toFixed(2))
    else setResolvedAmount(((declared + reported) / 2).toFixed(2))
  }

  function submit() {
    setErrorMsg(null)
    const amount = Number(resolvedAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      setErrorMsg('El monto final debe ser un número positivo.')
      return
    }
    if (notes.trim().length < 3) {
      setErrorMsg('La nota justificatoria debe tener al menos 3 caracteres.')
      return
    }
    resolve.mutate(
      { id: settlement.id, payload: { resolvedAmount: amount, decision, notes: notes.trim() } },
      {
        onSuccess: () => onClose(),
        onError: () => setErrorMsg('No pudimos resolver. Intenta de nuevo.'),
      },
    )
  }

  const restaurantName = settlement.restaurants?.name ?? 'Restaurante'
  const driverName = settlement.drivers?.full_name ?? 'Motorizado'

  return (
    <li className="rounded-2xl border border-red-200/60 bg-red-50/40 p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold text-red-700">
            <Icon name="report" size={14} filled />
            Diferencia reportada
          </div>
          <h3 className="mt-1 font-black text-xl text-on-surface">
            {restaurantName} ↔ {driverName}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            {formatDate(settlement.disputed_at ?? settlement.updated_at)} ·{' '}
            {settlement.order_count} {settlement.order_count === 1 ? 'pedido' : 'pedidos'}
          </p>
        </div>
      </div>

      {/* Amounts comparison */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255, 107, 53, 0.08)', border: '1px solid rgba(255, 107, 53, 0.2)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Driver declaró
          </div>
          <div className="font-black text-xl mt-1 font-mono tabular-nums text-on-surface">
            {money(declared)}
          </div>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(186, 26, 26, 0.08)', border: '1px solid rgba(186, 26, 26, 0.22)' }}
        >
          <div className="text-[10px] font-bold tracking-widest uppercase text-red-700">
            Restaurante recibió
          </div>
          <div className="font-black text-xl mt-1 font-mono tabular-nums text-red-700">
            {money(reported)}
          </div>
        </div>
        <div className="rounded-xl p-3 bg-surface-container-lowest border border-outline-variant/25">
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Diferencia
          </div>
          <div
            className="font-black text-xl mt-1 font-mono tabular-nums"
            style={{ color: diff > 0 ? '#991B1B' : diff < 0 ? '#065F46' : '#52525B' }}
          >
            {diff > 0 ? '+' : ''}
            {money(Math.abs(diff))}
          </div>
        </div>
      </div>

      {settlement.dispute_note && (
        <div className="rounded-xl p-3 bg-white/60 border border-outline-variant/25 text-sm">
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">
            Nota del restaurante
          </div>
          <div className="text-on-surface">{settlement.dispute_note}</div>
        </div>
      )}

      {!isOpen ? (
        <div className="flex gap-2">
          <Button size="md" onClick={onOpen}>
            <Icon name="gavel" filled />
            Resolver
          </Button>
          {settlement.restaurants?.phone && (
            <a
              href={`tel:+51${settlement.restaurants.phone}`}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-white/70 border border-outline-variant/30 hover:bg-white"
            >
              <Icon name="call" size={16} />
              Llamar restaurante
            </a>
          )}
          {settlement.drivers?.phone && (
            <a
              href={`tel:+51${settlement.drivers.phone}`}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-white/70 border border-outline-variant/30 hover:bg-white"
            >
              <Icon name="call" size={16} />
              Llamar motorizado
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl p-4 bg-white border border-outline-variant/30">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant mb-2">
              Decisión
            </div>
            <div className="grid grid-cols-3 gap-2">
              <DecisionOption
                active={decision === 'accept_driver'}
                label="Driver tenía razón"
                sublabel={money(declared)}
                onClick={() => onDecisionChange('accept_driver')}
              />
              <DecisionOption
                active={decision === 'accept_restaurant'}
                label="Restaurante tenía razón"
                sublabel={money(reported)}
                onClick={() => onDecisionChange('accept_restaurant')}
              />
              <DecisionOption
                active={decision === 'split'}
                label="Dividir la diferencia"
                sublabel={money((declared + reported) / 2)}
                onClick={() => onDecisionChange('split')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-xs text-on-surface-variant">Monto final (S/)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={resolvedAmount}
                onChange={(e) => setResolvedAmount(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-outline-variant/40 bg-white font-mono tabular-nums"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-on-surface-variant">Nota (mínimo 3 caracteres)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Ej: conversé con ambos, decidimos aceptar monto del restaurante..."
                className="mt-1 w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-sm"
              />
            </label>
          </div>

          {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}

          <div className="flex gap-2">
            <Button size="md" onClick={submit} disabled={resolve.isPending}>
              <Icon name="gavel" filled />
              {resolve.isPending ? 'Resolviendo...' : 'Resolver y cerrar caso'}
            </Button>
            <Button size="md" variant="secondary" onClick={onClose} disabled={resolve.isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}

function DecisionOption({
  active,
  label,
  sublabel,
  onClick,
}: {
  active: boolean
  label: string
  sublabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-3 text-left transition-all active:scale-[0.98]"
      style={
        active
          ? {
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 20px -6px rgba(255, 107, 53, 0.4)',
            }
          : {
              background: 'rgba(250, 250, 248, 1)',
              border: '1px solid rgba(225, 191, 181, 0.4)',
            }
      }
    >
      <div className="text-[10px] font-bold tracking-widest uppercase opacity-75">{label}</div>
      <div className="font-black text-sm mt-0.5 font-mono tabular-nums">{sublabel}</div>
    </button>
  )
}
