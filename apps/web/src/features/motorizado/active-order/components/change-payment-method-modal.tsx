'use client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon, MoneyInput } from '@tindivo/ui'
import { useMemo, useState } from 'react'
import { useChangePaymentMethod } from '../hooks/use-change-payment-method'

type Method = 'pending_yape' | 'pending_cash' | 'pending_mixed'

type Props = {
  orderId: string
  orderAmount: number
  currentStatus: Method | 'prepaid'
  onClose: () => void
}

function parseMoney(raw: string): number {
  if (!raw) return 0
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

const METHOD_OPTIONS: { value: Method; label: string; icon: string; gradient: string }[] = [
  {
    value: 'pending_yape',
    label: 'Solo Yape',
    icon: 'qr_code_2',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  },
  {
    value: 'pending_cash',
    label: 'Solo efectivo',
    icon: 'payments',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
  },
  {
    value: 'pending_mixed',
    label: 'Yape + Efectivo',
    icon: 'splitscreen',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #FF6B35 100%)',
  },
]

/**
 * Modal para que el motorizado cambie el método de pago en el último
 * minuto (status=picked_up). El monto del pedido es inmutable; solo
 * cambia cómo se cobra: yape, cash, o split mixto.
 */
export function ChangePaymentMethodModal({ orderId, orderAmount, currentStatus, onClose }: Props) {
  const initial: Method =
    currentStatus === 'pending_yape' || currentStatus === 'pending_cash'
      ? currentStatus
      : currentStatus === 'pending_mixed'
        ? 'pending_mixed'
        : 'pending_cash'

  const [method, setMethod] = useState<Method>(initial)
  const [yapePart, setYapePart] = useState('')
  const [cashPart, setCashPart] = useState('')
  const [paysWith, setPaysWith] = useState('')

  const change = useChangePaymentMethod(orderId)

  const yapeNum = parseMoney(yapePart)
  const cashNum = parseMoney(cashPart)
  const paysWithNum = parseMoney(paysWith)

  const splitSumCents = Math.round((yapeNum + cashNum) * 100)
  const orderCents = Math.round(orderAmount * 100)
  const splitOk =
    method !== 'pending_mixed' || (splitSumCents === orderCents && yapeNum > 0 && cashNum > 0)

  const cashTarget = method === 'pending_mixed' ? cashNum : orderAmount
  const previewChange = useMemo(() => {
    if (method === 'pending_yape') return 0
    return Math.max(paysWithNum - cashTarget, 0)
  }, [method, paysWithNum, cashTarget])

  const cashOk =
    method === 'pending_yape' ||
    (method === 'pending_cash' && paysWithNum >= orderAmount) ||
    (method === 'pending_mixed' && splitOk && paysWithNum >= cashNum)

  const canConfirm = cashOk && !change.isPending

  function handleConfirm() {
    if (!canConfirm) return
    const body: Orders.ChangePaymentMethodRequest = {
      paymentStatus: method,
      yapeAmount: method === 'pending_mixed' ? yapeNum : undefined,
      cashAmount: method === 'pending_mixed' ? cashNum : undefined,
      clientPaysWith:
        method === 'pending_cash' || method === 'pending_mixed' ? paysWithNum : undefined,
    }
    change.mutate(body, { onSuccess: () => onClose() })
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Cambiar método de pago"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'transparent' }}
      />
      <div
        className="relative w-full sm:max-w-md bg-surface-container-lowest rounded-t-[28px] sm:rounded-[28px] p-5 max-h-[92vh] overflow-y-auto"
        style={{
          boxShadow: '0 -16px 40px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-on-surface-variant">
              Cambiar método
            </div>
            <h3 className="font-black text-lg">Pago de S/ {orderAmount.toFixed(2)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container border border-outline-variant/40"
            aria-label="Cerrar"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {change.isError && (
          <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {change.error instanceof Error
              ? change.error.message
              : 'No se pudo cambiar el método de pago.'}
          </div>
        )}

        <div className="space-y-2.5 mb-4">
          {METHOD_OPTIONS.map((opt) => {
            const active = method === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMethod(opt.value)}
                className="w-full flex items-center gap-3 transition-all duration-200 active:scale-[0.98]"
                style={{
                  padding: '12px 14px',
                  borderRadius: '18px',
                  background: active ? 'rgba(255, 250, 248, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                  border: active
                    ? '1.5px solid rgba(255, 107, 53, 0.45)'
                    : '1px solid rgba(225, 191, 181, 0.3)',
                  boxShadow: active
                    ? '0 8px 22px -8px rgba(255, 107, 53, 0.3)'
                    : '0 1px 4px rgba(171, 53, 0, 0.03)',
                }}
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: opt.gradient,
                    color: '#ffffff',
                  }}
                >
                  <Icon name={opt.icon} size={20} filled />
                </span>
                <div className="flex-1 text-left font-bold text-on-surface">{opt.label}</div>
                {active && (
                  <span
                    className="shrink-0 inline-flex items-center justify-center"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
                      color: '#ffffff',
                    }}
                  >
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {method === 'pending_mixed' && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-sm font-semibold">División del pago</span>
              <span className="text-[10px] text-on-surface-variant">
                deben sumar S/ {orderAmount.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-yape"
                  className="text-[11px] font-bold tracking-wide uppercase text-purple-700"
                >
                  Yape
                </label>
                <MoneyInput
                  id="modal-yape"
                  value={yapePart}
                  onChange={(e) => setYapePart(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-cash"
                  className="text-[11px] font-bold tracking-wide uppercase text-orange-700"
                >
                  Efectivo
                </label>
                <MoneyInput
                  id="modal-cash"
                  value={cashPart}
                  onChange={(e) => setCashPart(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            {yapeNum + cashNum > 0 && !splitOk && (
              <div className="text-xs font-semibold text-red-600 px-1">
                La suma actual es S/ {(yapeNum + cashNum).toFixed(2)} — debe ser S/{' '}
                {orderAmount.toFixed(2)}.
              </div>
            )}
          </div>
        )}

        {(method === 'pending_cash' || method === 'pending_mixed') && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 px-1">
              <label htmlFor="modal-paysWith" className="text-sm font-semibold">
                Cliente paga con
              </label>
              <span className="text-[10px] text-on-surface-variant">
                {method === 'pending_mixed'
                  ? `sobre la parte efectivo (S/ ${cashTarget.toFixed(2)})`
                  : 'para calcular vuelto'}
              </span>
            </div>
            <MoneyInput
              id="modal-paysWith"
              value={paysWith}
              onChange={(e) => setPaysWith(e.target.value)}
              placeholder="Billete del cliente"
            />
            {previewChange > 0 && (
              <div
                className="rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-800">
                  Vuelto a dar
                </div>
                <div className="font-black text-emerald-900 text-2xl font-mono tabular-nums">
                  S/ {previewChange.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
            {change.isPending ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <Icon name="check" size={18} />
            )}
            Confirmar
          </Button>
        </div>
      </div>
    </dialog>
  )
}
