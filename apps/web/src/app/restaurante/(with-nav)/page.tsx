'use client'
import { ActiveOrders } from '@/features/restaurante/active-orders/components/active-orders'
import { PendingAcceptanceList } from '@/features/restaurante/pending-acceptance/components/pending-acceptance-list'
import { PlatformClosedBanner } from '@/features/restaurante/shared/components/platform-closed-banner'
import { usePlatformStatus } from '@/features/restaurante/shared/hooks/use-platform-status'
import { Icon, SolarCTA } from '@tindivo/ui'

export default function RestauranteHome() {
  const { data } = usePlatformStatus()
  const isClosed = data && !data.isOpen

  return (
    <main className="mx-auto w-full px-4 pb-8 pt-24 max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl space-y-5">
      <PlatformClosedBanner />

      {/* ── CTA "PEDIR MOTO" — full-width del contenedor en todos los breakpoints ── */}
      {isClosed ? (
        <div
          className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-outline-variant/40 bg-surface-container/30 px-5 py-7 text-center"
          aria-disabled="true"
        >
          <Icon name="block" className="text-outline-variant" />
          <div className="text-xs font-bold uppercase text-on-surface-variant">
            Pedidos pausados
          </div>
          <p className="max-w-xs text-xs text-on-surface-variant">
            No se pueden crear pedidos hasta que la plataforma vuelva a abrir.
          </p>
        </div>
      ) : (
        <SolarCTA
          href="/restaurante/nuevo-pedido"
          icon="two_wheeler"
          overline="Nuevo pedido"
          title="PEDIR MOTO"
          variant="solar"
        />
      )}

      {/* Pedidos en espera de aceptación — máxima urgencia */}
      <PendingAcceptanceList />

      {/* ── Pedidos activos ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <span
            className="inline-block h-5 w-1.5 rounded-full shrink-0"
            style={{
              background: 'linear-gradient(180deg, #FF6B35 0%, #FF8C42 100%)',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            }}
            aria-hidden="true"
          />
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Pedidos activos
          </h2>
        </div>
        <ActiveOrders />
      </section>
    </main>
  )
}
