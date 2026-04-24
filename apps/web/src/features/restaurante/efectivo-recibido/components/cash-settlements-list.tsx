'use client'
import type { RestaurantCashSettlementRow } from '@tindivo/api-client'
import { EmptyState, Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import {
  useConfirmCashSettlement,
  useDisputeCashSettlement,
  useRestaurantCashSettlements,
} from '../hooks/use-cash-settlements'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_ORDER: Record<string, number> = {
  delivered: 0,
  disputed: 1,
  confirmed: 2,
  resolved: 3,
  pending: 4,
}

export function CashSettlementsList() {
  const { data, isLoading } = useRestaurantCashSettlements()
  const [openDispute, setOpenDispute] = useState<string | null>(null)

  const items = [...(data?.items ?? [])].sort((a, b) => {
    const order = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
    if (order !== 0) return order
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const pendingCount = items.filter((i) => i.status === 'delivered').length

  return (
    <div className="space-y-4">
      <header>
        <h1 className="bleed-text font-black text-3xl text-on-surface">Efectivo recibido</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'entrega pendiente' : 'entregas pendientes'} de confirmación.`
            : 'Aquí aparecerán las entregas que te hagan los motorizados.'}
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="payments"
          title="Sin entregas"
          description="Cuando un motorizado entregue el efectivo que cobró, podrás confirmarlo aquí."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <SettlementCard
              key={s.id}
              settlement={s}
              isDisputeOpen={openDispute === s.id}
              onOpenDispute={() => setOpenDispute(s.id)}
              onCloseDispute={() => setOpenDispute(null)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function SettlementCard({
  settlement,
  isDisputeOpen,
  onOpenDispute,
  onCloseDispute,
}: {
  settlement: RestaurantCashSettlementRow
  isDisputeOpen: boolean
  onOpenDispute: () => void
  onCloseDispute: () => void
}) {
  const confirm = useConfirmCashSettlement()
  const dispute = useDisputeCashSettlement()
  const [reportedAmount, setReportedAmount] = useState<string>('')
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const declared = Number(settlement.delivered_amount ?? 0)
  const driverName = settlement.drivers?.full_name ?? 'Motorizado'

  function handleConfirm() {
    setErrorMsg(null)
    confirm.mutate(
      { id: settlement.id, receivedAmount: declared },
      {
        onError: () => setErrorMsg('No pudimos confirmar. Intenta de nuevo.'),
      },
    )
  }

  function handleDispute() {
    setErrorMsg(null)
    const amount = Number(reportedAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      setErrorMsg('Ingresa un monto válido.')
      return
    }
    if (note.trim().length < 3) {
      setErrorMsg('Escribe una nota de al menos 3 caracteres.')
      return
    }
    dispute.mutate(
      { id: settlement.id, reportedAmount: amount, note: note.trim() },
      {
        onSuccess: () => {
          onCloseDispute()
          setReportedAmount('')
          setNote('')
        },
        onError: () => setErrorMsg('No pudimos enviar el reporte. Intenta de nuevo.'),
      },
    )
  }

  return (
    <li
      className="rounded-[20px] p-5 border"
      style={{
        borderColor: colorForStatus(settlement.status).border,
        background: colorForStatus(settlement.status).bg,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="two_wheeler" size={18} className="text-on-surface-variant" filled />
            <div className="font-bold text-on-surface">{driverName}</div>
          </div>
          <div className="text-[11px] text-on-surface-variant mt-0.5">
            {formatDate(settlement.updated_at)} · {settlement.order_count}{' '}
            {settlement.order_count === 1 ? 'pedido' : 'pedidos'}
          </div>
        </div>
        <StatusPill status={settlement.status} />
      </div>

      <div className="mt-3 flex items-end gap-4">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Dice haber entregado
          </div>
          <div className="bleed-text text-3xl font-black font-mono tabular-nums text-on-surface">
            S/ {declared.toFixed(2)}
          </div>
        </div>
        {settlement.status === 'disputed' && settlement.reported_amount != null && (
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-red-700">
              Tú reportaste
            </div>
            <div className="bleed-text text-2xl font-black font-mono tabular-nums text-red-700">
              S/ {Number(settlement.reported_amount).toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {settlement.status === 'delivered' && !isDisputeOpen && (
        <div className="mt-4 space-y-2">
          <div
            className="text-[11px] rounded-xl p-2.5"
            style={{ background: 'rgba(255, 255, 255, 0.7)', color: '#92400E' }}
          >
            <Icon name="info" size={14} className="inline align-middle mr-1" />
            Primero cuenta el efectivo físicamente. Si coincide, confirma. Si no, reporta diferencia
            — Tindivo resuelve. No discutas en el local.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirm.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm text-white disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
                boxShadow: '0 8px 18px -4px rgba(5, 150, 105, 0.35)',
              }}
            >
              <Icon name="check_circle" size={18} filled />
              {confirm.isPending ? 'Confirmando...' : 'Confirmar recepción'}
            </button>
            <button
              type="button"
              onClick={onOpenDispute}
              disabled={dispute.isPending}
              className="px-4 h-11 rounded-xl font-semibold text-sm border disabled:opacity-50"
              style={{
                borderColor: 'rgba(225, 191, 181, 0.45)',
                background: 'rgba(255, 255, 255, 0.7)',
                color: '#92400E',
              }}
            >
              Reportar diferencia
            </button>
          </div>
          {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
        </div>
      )}

      {settlement.status === 'delivered' && isDisputeOpen && (
        <div className="mt-4 space-y-3">
          <div className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
            Reportar diferencia
          </div>
          <label className="block text-sm">
            <span className="text-xs text-on-surface-variant">Monto real recibido (S/)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={reportedAmount}
              onChange={(e) => setReportedAmount(e.target.value)}
              placeholder={`ej. ${Math.max(0, declared - 5).toFixed(2)}`}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-outline-variant/40 bg-white font-mono tabular-nums"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-on-surface-variant">Nota (mínimo 3 caracteres)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ej: faltaron 5 soles"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-sm"
            />
          </label>
          {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDispute}
              disabled={dispute.isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm text-white disabled:opacity-50"
              style={{ background: '#BA1A1A' }}
            >
              <Icon name="report" size={18} filled />
              {dispute.isPending ? 'Enviando...' : 'Enviar reporte'}
            </button>
            <button
              type="button"
              onClick={onCloseDispute}
              disabled={dispute.isPending}
              className="px-4 h-11 rounded-xl font-semibold text-sm border"
              style={{ borderColor: 'rgba(225, 191, 181, 0.45)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {settlement.status === 'confirmed' && (
        <div
          className="mt-3 flex items-center gap-2 text-[12px] font-semibold"
          style={{ color: '#065F46' }}
        >
          <Icon name="check_circle" size={16} filled />
          Confirmaste la recepción.
        </div>
      )}

      {settlement.status === 'disputed' && settlement.dispute_note && (
        <div
          className="mt-3 rounded-xl p-3 text-xs"
          style={{ background: 'rgba(255, 255, 255, 0.6)', color: '#991B1B' }}
        >
          <div className="font-semibold mb-1">Tu nota</div>
          <div>{settlement.dispute_note}</div>
          <div className="mt-2 text-[11px] opacity-85">Tindivo está revisando este caso.</div>
        </div>
      )}

      {settlement.status === 'resolved' && (
        <div
          className="mt-3 flex items-center gap-2 text-[12px] font-semibold"
          style={{ color: '#1E40AF' }}
        >
          <Icon name="gavel" size={16} filled />
          Caso resuelto por Tindivo.
        </div>
      )}
    </li>
  )
}

function StatusPill({ status }: { status: string }) {
  const c = colorForStatus(status)
  const label =
    {
      delivered: 'Por confirmar',
      confirmed: 'Confirmado',
      disputed: 'En revisión',
      resolved: 'Resuelto',
      pending: 'Pendiente',
    }[status] ?? status
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-full"
      style={{ background: c.pillBg, color: c.pillColor, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  )
}

function colorForStatus(status: string) {
  switch (status) {
    case 'delivered':
      return {
        bg: 'rgba(234, 179, 8, 0.08)',
        border: 'rgba(234, 179, 8, 0.32)',
        pillBg: 'rgba(234, 179, 8, 0.16)',
        pillColor: '#92400E',
      }
    case 'confirmed':
      return {
        bg: 'rgba(16, 185, 129, 0.06)',
        border: 'rgba(16, 185, 129, 0.28)',
        pillBg: 'rgba(16, 185, 129, 0.16)',
        pillColor: '#065F46',
      }
    case 'disputed':
      return {
        bg: 'rgba(186, 26, 26, 0.06)',
        border: 'rgba(186, 26, 26, 0.30)',
        pillBg: 'rgba(186, 26, 26, 0.16)',
        pillColor: '#991B1B',
      }
    case 'resolved':
      return {
        bg: 'rgba(59, 130, 246, 0.06)',
        border: 'rgba(59, 130, 246, 0.28)',
        pillBg: 'rgba(59, 130, 246, 0.16)',
        pillColor: '#1E40AF',
      }
    default:
      return {
        bg: 'rgba(161, 161, 170, 0.08)',
        border: 'rgba(161, 161, 170, 0.28)',
        pillBg: 'rgba(161, 161, 170, 0.16)',
        pillColor: '#52525B',
      }
  }
}
