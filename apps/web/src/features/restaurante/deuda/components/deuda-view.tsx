'use client'
import { EmptyState, Icon, Skeleton } from '@tindivo/ui'
import { useMyPayments } from '../hooks/use-settlements'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

type MethodCfg = { label: string; icon: string; bg: string; color: string }
const FALLBACK_METHOD: MethodCfg = {
  label: 'Otro',
  icon: 'more_horiz',
  bg: 'rgba(100, 116, 139, 0.12)',
  color: '#334155',
}
const METHOD_CONFIG: Record<string, MethodCfg> = {
  yape: {
    label: 'Yape',
    icon: 'qr_code_2',
    bg: 'rgba(124, 58, 237, 0.12)',
    color: '#5B21B6',
  },
  plin: {
    label: 'Plin',
    icon: 'qr_code',
    bg: 'rgba(6, 182, 212, 0.12)',
    color: '#0E7490',
  },
  bank_transfer: {
    label: 'Transferencia',
    icon: 'account_balance',
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#1D4ED8',
  },
  cash: {
    label: 'Efectivo',
    icon: 'payments',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#065F46',
  },
  other: {
    label: 'Otro',
    icon: 'more_horiz',
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#334155',
  },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DeudaView() {
  const { data, isLoading } = useMyPayments()

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const items = data.items ?? []

  return (
    <div className="space-y-5">
      {/* Balance hero */}
      <section
        className="relative overflow-hidden rounded-[24px] p-6"
        style={{
          background:
            data.balanceDue > 0
              ? 'linear-gradient(135deg, #B45309 0%, #D97706 55%, #F59E0B 100%)'
              : 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
          color: '#ffffff',
          boxShadow:
            data.balanceDue > 0
              ? '0 16px 40px -12px rgba(234, 88, 12, 0.5)'
              : '0 16px 40px -12px rgba(5, 150, 105, 0.5)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="text-[10px] font-bold tracking-[0.24em] uppercase opacity-85 mb-2">
            Saldo por pagar
          </div>
          <div className="bleed-text text-5xl font-black" style={{ letterSpacing: '-0.03em' }}>
            {money(data.balanceDue)}
          </div>
          <div className="text-xs opacity-85 mt-2">
            {data.balanceDue > 0
              ? 'Coordina el pago con Tindivo cuando puedas'
              : 'Estás al día. ¡Gracias!'}
          </div>
        </div>
      </section>

      {/* Instrucciones Yape */}
      {data.balanceDue > 0 && (
        <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                color: '#ffffff',
              }}
            >
              <Icon name="qr_code_2" size={22} filled />
            </span>
            <div className="flex-1">
              <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                Pagar con Yape
              </div>
              <p className="text-sm text-on-surface mt-1">
                Envía el monto al número de Tindivo y el admin registrará tu pago. Cada pago se
                descuenta inmediatamente del saldo.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Historial de pagos */}
      <section>
        <div className="flex items-center gap-3 mb-4 px-1">
          <span
            className="inline-block w-1.5 h-5 rounded-full"
            style={{
              background: 'linear-gradient(180deg, #FF6B35 0%, #FF8C42 100%)',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            }}
            aria-hidden="true"
          />
          <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Historial de pagos
          </h2>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            title="Aún no hay pagos registrados"
            description="Cuando coordines un pago con Tindivo, el admin lo registrará aquí y se descontará del saldo."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((p) => {
              const cfg = METHOD_CONFIG[p.paymentMethod] ?? FALLBACK_METHOD
              return (
                <li
                  key={p.id}
                  className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                        {formatDateTime(p.paidAt)}
                      </div>
                      <div className="bleed-text text-2xl font-black text-emerald-700 mt-1">
                        {money(p.amount)}
                      </div>
                      {p.paymentNote && (
                        <p className="text-xs text-on-surface-variant mt-2">{p.paymentNote}</p>
                      )}
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}33`,
                      }}
                    >
                      <Icon name={cfg.icon} size={12} />
                      {cfg.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
