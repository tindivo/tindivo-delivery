'use client'
import type { Orders } from '@tindivo/contracts'
import {
  BottomActionBar,
  Button,
  GlassTopBar,
  Icon,
  IconButton,
  MoneyInput,
  cn,
} from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCreateOrder } from '../hooks/use-create-order'

type Payment = 'prepaid' | 'pending_yape' | 'pending_cash'

const PREP_MINUTES = [10, 20, 30, 40, 50, 60] as const
type PrepMinutes = (typeof PREP_MINUTES)[number]

function parseMoney(raw: string): number {
  if (!raw) return 0
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '')
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

function prepOption(minutes: PrepMinutes): 'fast' | 'normal' | 'slow' {
  if (minutes <= 10) return 'fast'
  if (minutes >= 40) return 'slow'
  return 'normal'
}

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
    hint: 'Driver calcula vuelto',
    icon: 'payments',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
  },
]

export function NewOrderForm() {
  const router = useRouter()
  const createOrder = useCreateOrder()

  const [prepMinutes, setPrepMinutes] = useState<PrepMinutes>(20)
  const [payment, setPayment] = useState<Payment>('pending_cash')
  const [amount, setAmount] = useState<string>('')
  const [paysWith, setPaysWith] = useState<string>('')

  const carouselRef = useRef<HTMLDivElement>(null)

  const amountNum = parseMoney(amount)
  const paysWithNum = parseMoney(paysWith)
  const change = useMemo(() => {
    if (payment !== 'pending_cash') return 0
    return Math.max(paysWithNum - amountNum, 0)
  }, [payment, amountNum, paysWithNum])

  const needsAmount = payment !== 'prepaid'
  const canSubmit =
    (!needsAmount || amountNum > 0) &&
    (payment !== 'pending_cash' || paysWithNum >= amountNum)

  useEffect(() => {
    const idx = PREP_MINUTES.indexOf(prepMinutes)
    const el = carouselRef.current?.querySelector<HTMLButtonElement>(
      `[data-prep="${idx}"]`,
    )
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [prepMinutes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const body: Orders.CreateOrderRequest = {
      prepTimeOption: prepOption(prepMinutes),
      paymentStatus: payment,
      orderAmount: needsAmount ? amountNum : 0,
      clientPaysWith: payment === 'pending_cash' ? paysWithNum : undefined,
    }
    createOrder.mutate(body, {
      onSuccess: () => router.replace('/restaurante'),
    })
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ paddingBottom: 'calc(130px + env(safe-area-inset-bottom))' }}
    >
      {/* Ambient wash behind everything */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(255, 107, 53, 0.08) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(255, 140, 66, 0.06) 0%, transparent 40%)',
        }}
      />

      <GlassTopBar
        title="NUEVO PEDIDO"
        subtitle="Restaurante"
        left={
          <IconButton variant="ghost" onClick={() => router.back()} aria-label="Cancelar">
            <Icon name="close" />
          </IconButton>
        }
      />

      <form id="new-order-form" onSubmit={handleSubmit} className="pt-20 px-4 max-w-md mx-auto space-y-6">
        {/* Hero label */}
        <div className="flex items-center gap-3 px-1 pt-2">
          <span
            className="inline-block w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FF6B35 0%, #FF8C42 100%)',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.35)',
            }}
            aria-hidden="true"
          />
          <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Crea el pedido
          </h2>
        </div>

        {/* Prep time carousel */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-on-surface">
              Tiempo de preparación
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              {prepMinutes} min
            </span>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 -mx-4 px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {PREP_MINUTES.map((m, idx) => {
              const active = prepMinutes === m
              return (
                <button
                  key={m}
                  type="button"
                  data-prep={idx}
                  onClick={() => setPrepMinutes(m)}
                  className={cn(
                    'snap-center shrink-0 flex flex-col items-center justify-center transition-all duration-300 ease-out',
                    active ? 'scale-100' : 'scale-95 opacity-70 hover:opacity-100 hover:scale-100',
                  )}
                  style={{
                    width: '92px',
                    height: '108px',
                    borderRadius: '22px',
                    background: active
                      ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)'
                      : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: active
                      ? '1px solid rgba(255, 107, 53, 0.4)'
                      : '1px solid rgba(225, 191, 181, 0.3)',
                    boxShadow: active
                      ? '0 12px 30px -8px rgba(255, 107, 53, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      : '0 2px 8px rgba(171, 53, 0, 0.05)',
                    color: active ? '#ffffff' : '#1a1c1b',
                  }}
                >
                  <span
                    className="font-black"
                    style={{
                      fontSize: '30px',
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                      textShadow: active ? '0 1px 2px rgba(95, 25, 0, 0.25)' : 'none',
                    }}
                  >
                    {m}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-[0.14em] uppercase mt-1.5"
                    style={{ opacity: active ? 0.92 : 0.65 }}
                  >
                    min
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="mt-2 inline-block rounded-full"
                      style={{
                        width: '20px',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.75)',
                        boxShadow: '0 1px 4px rgba(255, 255, 255, 0.4)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Payment method */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-on-surface">Método de pago</span>
          </div>
          <div className="space-y-2.5">
            {paymentOptions.map((opt) => {
              const active = payment === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPayment(opt.value)}
                  className="w-full flex items-center gap-3.5 transition-all duration-300 ease-out active:scale-[0.98]"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '20px',
                    background: active
                      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 248, 0.95) 100%)'
                      : 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: active
                      ? '1.5px solid rgba(255, 107, 53, 0.45)'
                      : '1px solid rgba(225, 191, 181, 0.3)',
                    boxShadow: active
                      ? '0 10px 30px -10px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      : '0 1px 4px rgba(171, 53, 0, 0.03)',
                  }}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: opt.gradient,
                      color: '#ffffff',
                      boxShadow: active
                        ? '0 8px 20px -6px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                        : '0 4px 10px -4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform 300ms ease-out',
                    }}
                  >
                    <Icon name={opt.icon} size={22} filled />
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-bold text-on-surface truncate">{opt.label}</div>
                    <div className="text-[11px] text-on-surface-variant truncate">
                      {opt.hint}
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-flex items-center justify-center transition-all duration-300"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: active ? 'none' : '1.5px solid rgba(225, 191, 181, 0.6)',
                      background: active
                        ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)'
                        : 'transparent',
                      color: '#ffffff',
                      boxShadow: active ? '0 4px 10px rgba(255, 107, 53, 0.4)' : 'none',
                    }}
                  >
                    {active && <Icon name="check" size={14} />}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Amount (hidden for prepaid) */}
        {needsAmount && (
          <section key="amount-section" className="space-y-3 tindivo-reveal">
            <div className="flex items-center gap-2 px-1">
              <label htmlFor="amount" className="text-sm font-semibold text-on-surface">
                Monto del pedido
              </label>
              <span className="text-[10px] font-bold tracking-wider uppercase text-primary-container">
                obligatorio
              </span>
            </div>
            <MoneyInput
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto a cobrar"
              required
            />
          </section>
        )}

        {/* Pays with (cash only) */}
        {payment === 'pending_cash' && (
          <section key="cash-section" className="space-y-3 tindivo-reveal">
            <div className="flex items-center gap-2 px-1">
              <label htmlFor="paysWith" className="text-sm font-semibold text-on-surface">
                Cliente paga con
              </label>
              <span className="text-[10px] text-on-surface-variant">para calcular vuelto</span>
            </div>
            <MoneyInput
              id="paysWith"
              value={paysWith}
              onChange={(e) => setPaysWith(e.target.value)}
              placeholder="Billete del cliente"
              required
            />
            {change > 0 && (
              <div
                className="relative overflow-hidden flex items-center justify-between tindivo-pop"
                style={{
                  padding: '16px 18px',
                  borderRadius: '20px',
                  background:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.12) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  boxShadow: '0 8px 24px -8px rgba(16, 185, 129, 0.25)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 60%)',
                  }}
                />
                <div className="relative flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center justify-center"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#ffffff',
                      boxShadow: '0 6px 16px -4px rgba(16, 185, 129, 0.5)',
                    }}
                  >
                    <Icon name="payments" size={18} filled />
                  </span>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-emerald-700">
                      Vuelto
                    </div>
                    <div className="text-[10px] text-emerald-900/60">
                      para el cliente
                    </div>
                  </div>
                </div>
                <span
                  className="relative font-black text-emerald-900"
                  style={{
                    fontSize: '26px',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  S/ {change.toFixed(2)}
                </span>
              </div>
            )}
          </section>
        )}

      </form>

      <BottomActionBar>
        <Button
          type="submit"
          form="new-order-form"
          size="lg"
          className="w-full"
          disabled={!canSubmit || createOrder.isPending}
        >
          {createOrder.isPending ? 'Creando pedido...' : 'Crear pedido'}
          <Icon name={createOrder.isPending ? 'progress_activity' : 'arrow_forward'} />
        </Button>
      </BottomActionBar>
    </div>
  )
}
