'use client'
import { EmptyState, Icon, Skeleton } from '@tindivo/ui'
import { useSettlements } from '../hooks/use-settlements'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pending: {
    label: 'Pendiente',
    bg: 'rgba(234, 179, 8, 0.12)',
    color: '#92400E',
    border: 'rgba(234, 179, 8, 0.25)',
  },
  paid: {
    label: 'Pagada',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#065F46',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  overdue: {
    label: 'Vencida',
    bg: 'rgba(186, 26, 26, 0.12)',
    color: '#991B1B',
    border: 'rgba(186, 26, 26, 0.25)',
  },
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sd = s.getDate()
  const ed = e.getDate()
  const m = e.toLocaleDateString('es-PE', { month: 'long' })
  return `${sd} – ${ed} ${m}`
}

export function DeudaView() {
  const { data, isLoading } = useSettlements()

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
              ? 'Paga antes del vencimiento con Yape'
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
                Envía el monto exacto al número de Tindivo y luego el admin marcará tu liquidación
                como pagada.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Lista de liquidaciones */}
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
            Liquidaciones
          </h2>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            title="Sin liquidaciones aún"
            description="Las liquidaciones semanales aparecerán aquí cuando el admin las genere."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((s) => {
              const cfg = (statusConfig[s.status] ?? statusConfig.pending) as {
                label: string
                bg: string
                color: string
                border: string
              }
              return (
                <li
                  key={s.id}
                  className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
                        {formatPeriod(s.periodStart, s.periodEnd)}
                      </div>
                      <div className="bleed-text text-2xl font-black text-on-surface mt-1">
                        {money(s.totalAmount)}
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        {s.orderCount} {s.orderCount === 1 ? 'pedido' : 'pedidos'} · Vence{' '}
                        {new Date(s.dueDate).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  {s.paidAt && (
                    <div className="text-xs text-on-surface-variant mt-3 flex items-center gap-1.5">
                      <Icon name="check_circle" size={14} filled />
                      Pagada el{' '}
                      {new Date(s.paidAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
