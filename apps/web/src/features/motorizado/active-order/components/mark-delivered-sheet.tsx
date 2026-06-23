'use client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon, MoneyInput } from '@tindivo/ui'
import { useMemo, useState } from 'react'
import { useMarkDelivered } from '../hooks/use-mark-delivered'

type Method = 'pending_yape' | 'pending_cash' | 'pending_mixed'
type Kind = 'unchanged' | 'cash_exact' | 'change_to'

type Props = {
  orderId: string
  orderAmount: number
  paymentStatus: 'prepaid' | Method
  changeToGive: number | null
  clientPaysWith: number | null
  cashAmount: number | null
  yapeAmount: number | null
  onClose: () => void
  addressCapture?: Orders.MarkDeliveredRequest['addressCapture']
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

function methodLabel(s: 'prepaid' | Method): string {
  if (s === 'prepaid') return 'Prepagado'
  if (s === 'pending_yape') return 'Yape'
  if (s === 'pending_cash') return 'Efectivo'
  return 'Yape + Efectivo'
}

/**
 * Sheet que se abre al tocar "Entregar". Permite al motorizado registrar
 * el método real (puede coincidir con el plan, ser pago exacto sin usar
 * vuelto, o un cambio total a otro método).
 *
 * Para `prepaid` solo aparece el botón de confirmar (no se permite cambio).
 */
export function MarkDeliveredSheet({
  orderId,
  orderAmount,
  paymentStatus,
  changeToGive,
  clientPaysWith,
  cashAmount,
  yapeAmount,
  onClose,
  addressCapture,
}: Props) {
  const isPrepaid = paymentStatus === 'prepaid'
  const hadAdvance = (changeToGive ?? 0) > 0

  const [kind, setKind] = useState<Kind>('unchanged')

  // Estado del sub-formulario change_to (igual que ChangePaymentMethodModal)
  const [method, setMethod] = useState<Method>(
    paymentStatus === 'prepaid' ? 'pending_cash' : paymentStatus,
  )
  const [yapePart, setYapePart] = useState(yapeAmount?.toFixed(2) ?? '')
  const [cashPart, setCashPart] = useState(cashAmount?.toFixed(2) ?? '')
  const [paysWith, setPaysWith] = useState(clientPaysWith?.toFixed(2) ?? '')

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

  const deliver = useMarkDelivered(orderId)

  const canConfirm =
    !deliver.isPending && (kind !== 'change_to' || (cashOk && method !== ('prepaid' as Method)))

  function buildBody(): Orders.MarkDeliveredRequest {
    const payment = (() => {
      if (kind === 'unchanged') return { kind: 'unchanged' as const }
      if (kind === 'cash_exact') return { kind: 'cash_exact' as const }
      return {
        kind: 'change_to' as const,
        paymentStatus: method,
        yapeAmount: method === 'pending_mixed' ? yapeNum : undefined,
        cashAmount: method === 'pending_mixed' ? cashNum : undefined,
        clientPaysWith:
          method === 'pending_cash' || method === 'pending_mixed' ? paysWithNum : undefined,
      }
    })()

    return {
      payment,
      addressCapture,
    }
  }

  function handleConfirm() {
    if (!canConfirm) return
    deliver.mutate(buildBody())
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-[200] m-0 w-full h-full max-w-none max-h-none flex items-end sm:items-center justify-center bg-transparent"
      style={{ background: 'rgba(0, 0, 0, 0.55)' }}
      aria-label="Confirmar entrega"
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
              Confirmar entrega
            </div>
            <h3 className="font-black text-lg">S/ {orderAmount.toFixed(2)}</h3>
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

        {/* Resumen del plan original */}
        <div
          className="mb-4 rounded-2xl p-3 flex items-center gap-3"
          style={{
            background: 'rgba(255, 250, 248, 0.7)',
            border: '1px solid rgba(225, 191, 181, 0.4)',
          }}
        >
          <Icon name="receipt_long" size={18} className="text-on-surface-variant" filled />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
              Plan original
            </div>
            <div className="text-sm font-semibold text-on-surface">
              {methodLabel(paymentStatus)}
              {hadAdvance && (
                <>
                  {' · '}
                  <span className="font-mono">vuelto S/ {(changeToGive ?? 0).toFixed(2)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {deliver.isError && (
          <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {deliver.error instanceof Error
              ? deliver.error.message
              : 'No se pudo confirmar la entrega.'}
          </div>
        )}

        {isPrepaid ? (
          <p className="mb-4 text-sm text-on-surface-variant">
            Pedido prepagado. No requiere cobro al cliente — solo confirma la entrega.
          </p>
        ) : (
          <>
            <div className="text-[11px] font-bold tracking-widest uppercase text-on-surface-variant mb-2 px-1">
              ¿Cómo pagó el cliente?
            </div>
            <div className="space-y-2 mb-4">
              <OptionButton
                active={kind === 'unchanged'}
                onClick={() => setKind('unchanged')}
                icon="check_circle"
                gradient="linear-gradient(135deg, #10B981 0%, #065F46 100%)"
                label="Tal cual lo planeado"
                description={methodLabel(paymentStatus)}
              />
              {hadAdvance && (
                <OptionButton
                  active={kind === 'cash_exact'}
                  onClick={() => setKind('cash_exact')}
                  icon="payments"
                  gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                  label="Pagó exacto"
                  description={`Mantengo el vuelto S/ ${(changeToGive ?? 0).toFixed(2)}`}
                />
              )}
              <OptionButton
                active={kind === 'change_to'}
                onClick={() => setKind('change_to')}
                icon="swap_horiz"
                gradient="linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)"
                label="Cambió el método"
                description="El cliente pagó distinto"
              />
            </div>

            {kind === 'change_to' && (
              <div
                className="rounded-2xl p-3 mb-4 space-y-3"
                style={{
                  background: 'rgba(124, 58, 237, 0.04)',
                  border: '1px solid rgba(124, 58, 237, 0.18)',
                }}
              >
                <div className="space-y-2">
                  {METHOD_OPTIONS.map((opt) => {
                    const active = method === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMethod(opt.value)}
                        className="w-full flex items-center gap-3 transition-all duration-200 active:scale-[0.98]"
                        style={{
                          padding: '10px 12px',
                          borderRadius: '14px',
                          background: active
                            ? 'rgba(255, 250, 248, 0.95)'
                            : 'rgba(255, 255, 255, 0.7)',
                          border: active
                            ? '1.5px solid rgba(255, 107, 53, 0.45)'
                            : '1px solid rgba(225, 191, 181, 0.3)',
                        }}
                      >
                        <span
                          className="shrink-0 inline-flex items-center justify-center"
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: opt.gradient,
                            color: '#ffffff',
                          }}
                        >
                          <Icon name={opt.icon} size={18} filled />
                        </span>
                        <div className="flex-1 text-left text-sm font-bold text-on-surface">
                          {opt.label}
                        </div>
                        {active && <Icon name="check" size={16} className="text-orange-600" />}
                      </button>
                    )
                  })}
                </div>

                {method === 'pending_mixed' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant px-1">
                      División: deben sumar S/ {orderAmount.toFixed(2)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="md-yape"
                          className="text-[10px] font-bold tracking-wide uppercase text-purple-700"
                        >
                          Yape
                        </label>
                        <MoneyInput
                          id="md-yape"
                          value={yapePart}
                          onChange={(e) => setYapePart(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label
                          htmlFor="md-cash"
                          className="text-[10px] font-bold tracking-wide uppercase text-orange-700"
                        >
                          Efectivo
                        </label>
                        <MoneyInput
                          id="md-cash"
                          value={cashPart}
                          onChange={(e) => setCashPart(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {yapeNum + cashNum > 0 && !splitOk && (
                      <div className="text-xs font-semibold text-red-600 px-1">
                        Suma S/ {(yapeNum + cashNum).toFixed(2)} — debe ser S/{' '}
                        {orderAmount.toFixed(2)}.
                      </div>
                    )}
                  </div>
                )}

                {(method === 'pending_cash' || method === 'pending_mixed') && (
                  <div className="space-y-2">
                    <label
                      htmlFor="md-paysWith"
                      className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant px-1"
                    >
                      Cliente paga con
                    </label>
                    <MoneyInput
                      id="md-paysWith"
                      value={paysWith}
                      onChange={(e) => setPaysWith(e.target.value)}
                      placeholder="Billete del cliente"
                    />
                    {previewChange > 0 && (
                      <div
                        className="rounded-xl px-3 py-2 flex items-center justify-between"
                        style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-800">
                          Vuelto a dar
                        </div>
                        <div className="font-black text-emerald-900 text-lg font-mono tabular-nums">
                          S/ {previewChange.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
            {deliver.isPending ? (
              <Icon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <Icon name="check_circle" size={18} filled />
            )}
            Confirmar entrega
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function OptionButton({
  active,
  onClick,
  icon,
  gradient,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: string
  gradient: string
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
          background: gradient,
          color: '#ffffff',
        }}
      >
        <Icon name={icon} size={20} filled />
      </span>
      <div className="flex-1 text-left">
        <div className="font-bold text-on-surface text-sm">{label}</div>
        <div className="text-[11px] text-on-surface-variant">{description}</div>
      </div>
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
}
