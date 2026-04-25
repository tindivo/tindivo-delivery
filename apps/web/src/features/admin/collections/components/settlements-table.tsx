'use client'
import type { AdminSettlementRow } from '@tindivo/api-client'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import { useState } from 'react'
import { RegisterPaymentForm } from './register-payment-form'

type Props = {
  items: AdminSettlementRow[]
  isLoading: boolean
  mode: 'pending' | 'overdue' | 'paid'
}

const METHOD_LABEL: Record<string, string> = {
  yape: 'Yape',
  plin: 'Plin',
  bank_transfer: 'Transferencia',
  cash: 'Efectivo',
  other: 'Otro',
}

export function SettlementsTable({ items, isLoading, mode }: Props) {
  const [openPayId, setOpenPayId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    )
  }

  if (items.length === 0) return null

  const actionable = mode === 'pending' || mode === 'overdue'

  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
          <tr>
            <th className="text-left px-4 py-3">Restaurante</th>
            <th className="text-left px-4 py-3">Período</th>
            <th className="text-left px-4 py-3"># pedidos</th>
            <th className="text-left px-4 py-3">Monto</th>
            <th className="text-left px-4 py-3">{mode === 'paid' ? 'Pagado' : 'Vence'}</th>
            <th className="text-right px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const isOpen = openPayId === s.id
            const amount = Number(s.total_amount)
            return (
              <FragmentRow
                key={s.id}
                settlement={s}
                amount={amount}
                mode={mode}
                actionable={actionable}
                isOpen={isOpen}
                onOpen={() => setOpenPayId(s.id)}
                onClose={() => setOpenPayId(null)}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentRow({
  settlement: s,
  amount,
  mode,
  actionable,
  isOpen,
  onOpen,
  onClose,
}: {
  settlement: AdminSettlementRow
  amount: number
  mode: 'pending' | 'overdue' | 'paid'
  actionable: boolean
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <>
      <tr className="border-t border-outline-variant/10 hover:bg-surface-container-low/50">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rounded-md border border-black/10"
              style={{ background: `#${s.accent_color}` }}
            />
            <span className="font-bold">{s.restaurant_name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">
          {formatDateShort(s.period_start)} – {formatDateShort(s.period_end)}
        </td>
        <td className="px-4 py-3 font-mono text-xs">{s.order_count}</td>
        <td className="px-4 py-3 font-bold">S/ {amount.toFixed(2)}</td>
        <td className="px-4 py-3 text-xs">
          {mode === 'paid' ? (
            <div className="flex flex-col">
              <span className="font-semibold">{formatDateShort(s.paid_at ?? s.updated_at)}</span>
              {s.payment_method && (
                <span className="text-on-surface-variant">
                  {METHOD_LABEL[s.payment_method] ?? s.payment_method}
                </span>
              )}
            </div>
          ) : (
            <DueDateCell dueDate={s.due_date} overdue={mode === 'overdue'} />
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {actionable ? (
            isOpen ? null : (
              <Button size="sm" onClick={onOpen}>
                <Icon name="payments" size={14} />
                Registrar pago
              </Button>
            )
          ) : (
            s.payment_note && (
              <span
                className="inline-flex items-center gap-1 text-on-surface-variant text-xs"
                title={s.payment_note}
              >
                <Icon name="sticky_note_2" size={14} />
                Nota
              </span>
            )
          )}
        </td>
      </tr>
      {actionable && isOpen && (
        <tr className="border-t border-outline-variant/10 bg-surface-container-low/30">
          <td colSpan={6} className="px-4 py-3">
            <RegisterPaymentForm
              settlementId={s.id}
              amount={amount}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function DueDateCell({ dueDate, overdue }: { dueDate: string; overdue: boolean }) {
  const today = new Date().toISOString().slice(0, 10)
  const isPast = dueDate < today
  const tone = overdue || isPast ? 'text-red-700 font-semibold' : 'text-on-surface'
  return <span className={`font-mono ${tone}`}>{formatDateShort(dueDate)}</span>
}

function formatDateShort(date: string | null): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  } catch {
    return date.slice(0, 10)
  }
}
