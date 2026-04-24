'use client'
import { useDriverProfile } from '@/features/motorizado/perfil/hooks/use-driver-profile'
import { Button, ColorDot, EmptyState, Icon, Skeleton } from '@tindivo/ui'
import { useCashSummary } from '../hooks/use-cash-summary'
import { useDeliverCash } from '../hooks/use-deliver-cash'

const money = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

function statusChip(status: string | null) {
  if (!status) return null
  if (status === 'delivered') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(234, 179, 8, 0.12)',
          color: '#92400E',
          border: '1px solid rgba(234, 179, 8, 0.25)',
        }}
      >
        <Icon name="schedule" size={12} />
        Pendiente confirmar
      </span>
    )
  }
  if (status === 'disputed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(186, 26, 26, 0.12)',
          color: '#991B1B',
          border: '1px solid rgba(186, 26, 26, 0.25)',
        }}
      >
        <Icon name="priority_high" size={12} />
        Diferencia
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(100, 116, 139, 0.12)',
          color: '#334155',
          border: '1px solid rgba(100, 116, 139, 0.25)',
        }}
      >
        Pendiente
      </span>
    )
  }
  return null
}

export function EfectivoList() {
  const profile = useDriverProfile()
  const { data, isLoading } = useCashSummary(profile.data?.id)
  const deliver = useDeliverCash()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }

  const items = data?.items ?? []
  const totalPending = items.reduce((s, it) => s + it.totalCash, 0)
  const totalCount = items.reduce((s, it) => s + it.orderCount, 0)

  if (items.length === 0) {
    return (
      <EmptyState
        icon="payments"
        title="Sin efectivo pendiente"
        description="Cuando entregues pedidos pagados en efectivo, aparecerán aquí para liquidar."
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero total */}
      <section
        className="relative overflow-hidden rounded-[24px] p-5"
        style={{
          background: 'linear-gradient(135deg, #065F46 0%, #059669 55%, #10B981 100%)',
          color: '#ffffff',
          boxShadow: '0 16px 40px -12px rgba(5, 150, 105, 0.5)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="text-[10px] font-bold tracking-[0.24em] uppercase opacity-80 mb-2">
            Efectivo por entregar
          </div>
          <div className="bleed-text text-5xl font-black" style={{ letterSpacing: '-0.03em' }}>
            {money(totalPending)}
          </div>
          <div className="text-xs opacity-85 mt-2">
            {totalCount} {totalCount === 1 ? 'pedido' : 'pedidos'} · {items.length}{' '}
            {items.length === 1 ? 'restaurante' : 'restaurantes'}
          </div>
          <div className="text-[11px] opacity-75 mt-1">
            Total que cobraste a los clientes (incluye los vueltos)
          </div>
        </div>
      </section>

      {/* Lista de restaurantes */}
      <ul className="space-y-3">
        {items.map((it) => {
          const canDeliver = it.settlementStatus === null
          return (
            <li
              key={it.restaurantId}
              className="relative overflow-hidden rounded-[24px] p-5 bg-gradient-to-br from-white to-[#fafaf8] border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 bottom-0 w-1.5 rounded-tl-[24px] rounded-bl-[24px]"
                style={{
                  backgroundColor: `#${it.accentColor}`,
                  boxShadow: `0 0 16px #${it.accentColor}40`,
                }}
              />
              <div className="pl-2 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColorDot color={it.accentColor} size={10} label={it.restaurantName} />
                    <span className="font-bold truncate text-on-surface">{it.restaurantName}</span>
                  </div>
                  {statusChip(it.settlementStatus)}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="bleed-text text-2xl font-black text-on-surface">
                      {money(it.totalCash)}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      {it.orderCount} {it.orderCount === 1 ? 'pedido' : 'pedidos'}
                    </div>
                  </div>
                </div>

                {canDeliver ? (
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={deliver.isPending}
                    onClick={() =>
                      deliver.mutate({ restaurantId: it.restaurantId, amount: it.totalCash })
                    }
                  >
                    <Icon name="payments" filled />
                    Entregar {money(it.totalCash)}
                  </Button>
                ) : it.settlementStatus === 'disputed' ? (
                  <p className="text-xs text-on-surface-variant pl-1">
                    El restaurante reportó una diferencia. Tindivo está revisando.
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant pl-1">
                    Esperando que el restaurante confirme la recepción.
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
