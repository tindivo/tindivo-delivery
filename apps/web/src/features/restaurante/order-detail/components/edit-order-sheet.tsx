'use client'
import { ApiError } from '@tindivo/api-client'
import type { Orders } from '@tindivo/contracts'
import { Button, Icon, MoneyInput, cn } from '@tindivo/ui'
import { useEffect, useMemo, useState } from 'react'
import { useEditRestaurantOrder } from '../hooks/use-edit-restaurant-order'

type Payment = 'prepaid' | 'pending_yape' | 'pending_cash' | 'pending_mixed'

const paymentOptions: {
  value: Payment
  label: string
  hint: string
  icon: string
  gradient: string
}[] = [
  {
    value: 'prepaid',
    label: 'Ya pagó',
    hint: 'Cliente canceló por adelantado',
    icon: 'verified',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  {
    value: 'pending_yape',
    label: 'Cobrar con Yape',
    hint: 'Driver cobra al entregar',
    icon: 'qr_code_2',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  },
  {
    value: 'pending_cash',
    label: 'Cobrar efectivo',
    hint: 'Adelanta el vuelto al driver',
    icon: 'payments',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
  },
  {
    value: 'pending_mixed',
    label: 'Yape + Efectivo',
    hint: 'Cliente paga parte por Yape y parte cash',
    icon: 'splitscreen',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #FF6B35 100%)',
  },
]

function parseMoney(raw: string): number {
  if (!raw) return 0
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

type Props = {
  orderId: string
  initial: {
    clientName: string | null
    paymentStatus: Payment
    orderAmount: number
    yapeAmount: number | null
    cashAmount: number | null
    clientPaysWith: number | null
  }
  onClose: () => void
}

/**
 * Form de edición del pedido por el restaurante. Se abre como sheet de
 * pantalla completa para reusar el patrón visual de NewOrderForm sin
 * necesidad de extraer subcomponentes (la duplicación es controlada).
 *
 * Solo se invoca cuando el pedido está en un estado editable (gestionado
 * por el padre que decide mostrar el botón "Editar").
 */
export function EditOrderSheet({ orderId, initial, onClose }: Props) {
  const edit = useEditRestaurantOrder(orderId)
  const [clientName, setClientName] = useState(initial.clientName ?? '')
  const [payment, setPayment] = useState<Payment>(initial.paymentStatus)
  const [amount, setAmount] = useState<string>(
    initial.orderAmount > 0 ? initial.orderAmount.toFixed(2) : '',
  )
  const [paysWith, setPaysWith] = useState<string>(
    initial.clientPaysWith != null ? initial.clientPaysWith.toFixed(2) : '',
  )
  const [yapePart, setYapePart] = useState<string>(
    initial.yapeAmount != null ? initial.yapeAmount.toFixed(2) : '',
  )
  const [cashPart, setCashPart] = useState<string>(
    initial.cashAmount != null ? initial.cashAmount.toFixed(2) : '',
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [touchedAmount, setTouchedAmount] = useState(false)

  const handleAmountChange = (val: string) => {
    let cleaned = val.replace(/[^0-9.,]/g, '')
    cleaned = cleaned.replace(',', '.')
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    if (parts[1] !== undefined) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2)
    }
    setAmount(cleaned)
  }

  const amountNum = parseMoney(amount)
  const paysWithNum = parseMoney(paysWith)
  const yapePartNum = parseMoney(yapePart)
  const cashPartNum = parseMoney(cashPart)
  const splitSumCents = Math.round((yapePartNum + cashPartNum) * 100)
  const orderAmountCents = Math.round(amountNum * 100)
  const splitSumsCorrect = payment !== 'pending_mixed' || splitSumCents === orderAmountCents
  const splitBothPositive = payment !== 'pending_mixed' || (yapePartNum > 0 && cashPartNum > 0)

  const cashTarget = payment === 'pending_mixed' ? cashPartNum : amountNum
  const change = useMemo(() => {
    if (payment === 'pending_cash') return Math.max(paysWithNum - amountNum, 0)
    if (payment === 'pending_mixed') return Math.max(paysWithNum - cashPartNum, 0)
    return 0
  }, [payment, amountNum, paysWithNum, cashPartNum])

  const amountValidationError = useMemo(() => {
    if (!amount) return 'Ingresa el monto del pedido'
    const hasInvalidChars = /[^0-9.]/.test(amount)
    const parts = amount.split('.')
    const hasMultipleDots = parts.length > 2
    const hasTooManyDecimals = parts[1] !== undefined && parts[1].length > 2

    if (hasInvalidChars || hasMultipleDots || hasTooManyDecimals) {
      return 'Ingresa solo números (ejemplo: 25.00)'
    }

    const parsed = parseMoney(amount)
    if (parsed <= 0) {
      return 'El monto debe ser mayor a S/. 0'
    }
    return null
  }, [amount])

  const canSubmit =
    amountValidationError === null &&
    (payment !== 'pending_cash' || paysWithNum >= amountNum) &&
    (payment !== 'pending_mixed' ||
      (splitBothPositive && splitSumsCorrect && paysWithNum >= cashPartNum))

  const showAmountError = touchedAmount && amountValidationError !== null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      setTouchedAmount(true)
      return
    }
    setErrorMsg(null)

    const trimmedName = clientName.trim()
    const body: Orders.EditOrderByRestaurantRequest = {
      clientName: trimmedName.length > 0 ? trimmedName : null,
      paymentStatus: payment,
      orderAmount: amountNum,
      yapeAmount: payment === 'pending_mixed' ? yapePartNum : undefined,
      cashAmount: payment === 'pending_mixed' ? cashPartNum : undefined,
      clientPaysWith:
        payment === 'pending_cash' || payment === 'pending_mixed' ? paysWithNum : undefined,
    }
    try {
      await edit.mutateAsync(body)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problem.detail ?? err.problem.title)
      } else {
        setErrorMsg('No se pudo guardar el cambio. Intenta de nuevo.')
      }
    }
  }

  // Cierra el sheet con tecla Escape (UX estándar de modales).
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <dialog
      open
      aria-label="Editar pedido"
      className="fixed inset-0 z-50 m-0 p-0 bg-black/40 w-full h-full max-w-none max-h-none flex items-end md:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="w-full md:max-w-md bg-surface-container-lowest rounded-t-[28px] md:rounded-[28px] max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 -10px 40px rgba(0,0,0,0.18)' }}
      >
        <div className="sticky top-0 z-10 bg-surface-container-lowest/95 backdrop-blur-md flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-black text-lg text-on-surface">Editar pedido</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low active:scale-95"
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          {/* Nombre cliente */}
          <section className="space-y-2">
            <label htmlFor="edit-clientName" className="text-sm font-semibold text-on-surface">
              Nombre del cliente
              <span className="ml-2 text-[10px] font-bold tracking-wider uppercase text-on-surface-variant/60">
                opcional
              </span>
            </label>
            <input
              id="edit-clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={80}
              placeholder="Ej: Juan, María Fernanda"
              className="w-full px-4 py-3 rounded-2xl text-base font-semibold border focus:outline-none focus:ring-2 focus:ring-primary/40"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                borderColor: 'rgba(225, 191, 181, 0.4)',
              }}
            />
          </section>

          {/* Método de pago */}
          <section className="space-y-2">
            <span className="text-sm font-semibold text-on-surface">Método de pago</span>
            <div className="space-y-2">
              {paymentOptions.map((opt) => {
                const active = payment === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPayment(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low',
                    )}
                  >
                    <span
                      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl text-white"
                      style={{ background: opt.gradient }}
                    >
                      <Icon name={opt.icon} size={20} filled />
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-bold text-on-surface text-sm truncate">{opt.label}</div>
                      <div className="text-[11px] text-on-surface-variant truncate">{opt.hint}</div>
                    </div>
                    {active && (
                      <Icon name="check_circle" size={20} className="text-primary" filled />
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Monto */}
          <section className="space-y-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="edit-amount" className="text-sm font-semibold text-on-surface">
                Monto del pedido
              </label>
              <span className="text-[11px] text-on-surface-variant">Comida + delivery</span>
            </div>
            <MoneyInput
              id="edit-amount"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onBlur={() => setTouchedAmount(true)}
              placeholder="Ej: 25.00"
              required
              style={{
                border: showAmountError
                  ? '1px solid rgba(186, 26, 26, 0.55)'
                  : '1px solid rgba(225, 191, 181, 0.35)',
              }}
            />
            {showAmountError && (
              <p className="text-[11px] font-semibold text-red-600 px-1 mt-1">
                {amountValidationError}
              </p>
            )}
          </section>

          {/* Split mixto */}
          {payment === 'pending_mixed' && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">División</span>
                <span className="text-[10px] text-on-surface-variant">
                  suma S/ {amountNum.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-yapePart"
                    className="text-[11px] font-bold tracking-wide uppercase text-purple-700"
                  >
                    Yape
                  </label>
                  <MoneyInput
                    id="edit-yapePart"
                    value={yapePart}
                    onChange={(e) => setYapePart(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-cashPart"
                    className="text-[11px] font-bold tracking-wide uppercase text-orange-700"
                  >
                    Efectivo
                  </label>
                  <MoneyInput
                    id="edit-cashPart"
                    value={cashPart}
                    onChange={(e) => setCashPart(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              {amountNum > 0 && yapePartNum + cashPartNum > 0 && !splitSumsCorrect && (
                <div className="text-xs font-semibold text-red-600">
                  La suma actual es S/ {(yapePartNum + cashPartNum).toFixed(2)} — debe ser S/{' '}
                  {amountNum.toFixed(2)}.
                </div>
              )}
            </section>
          )}

          {/* Paga con (cash o mixed) */}
          {(payment === 'pending_cash' || payment === 'pending_mixed') && (
            <section className="space-y-2">
              <label htmlFor="edit-paysWith" className="text-sm font-semibold text-on-surface">
                Cliente paga con
                <span className="ml-2 text-[10px] text-on-surface-variant">
                  {payment === 'pending_mixed'
                    ? `sobre S/ ${cashTarget.toFixed(2)}`
                    : 'para vuelto'}
                </span>
              </label>
              <MoneyInput
                id="edit-paysWith"
                value={paysWith}
                onChange={(e) => setPaysWith(e.target.value)}
                placeholder="Billete del cliente"
                required
              />
              {change > 0 && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Vuelto
                  </span>
                  <span className="font-black text-emerald-900">S/ {change.toFixed(2)}</span>
                </div>
              )}
            </section>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={onClose}
              disabled={edit.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={!canSubmit || edit.isPending}
            >
              <Icon name={edit.isPending ? 'progress_activity' : 'check'} />
              {edit.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
