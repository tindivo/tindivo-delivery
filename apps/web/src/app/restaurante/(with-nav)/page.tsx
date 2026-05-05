'use client'
import { ActiveOrders } from '@/features/restaurante/active-orders/components/active-orders'
import { PendingAcceptanceList } from '@/features/restaurante/pending-acceptance/components/pending-acceptance-list'
import { PlatformClosedBanner } from '@/features/restaurante/shared/components/platform-closed-banner'
import { usePlatformStatus } from '@/features/restaurante/shared/hooks/use-platform-status'
import { Icon, SolarCTA } from '@tindivo/ui'
import Link from 'next/link'

export default function RestauranteHome() {
  const { data } = usePlatformStatus()
  const isClosed = data && !data.isOpen

  return (
    <main className="pt-24 pb-8 px-4 max-w-md mx-auto space-y-8">
      <PlatformClosedBanner />
      {isClosed ? (
        <div
          className="rounded-3xl border-2 border-dashed border-outline-variant/40 bg-surface-container/30 px-5 py-7 flex flex-col items-center gap-2 text-center"
          aria-disabled="true"
        >
          <Icon name="block" className="text-outline-variant" />
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Pedidos pausados
          </div>
          <p className="text-xs text-on-surface-variant max-w-xs">
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

      <PendingAcceptanceList />

      <Link
        href="/restaurante/negocio"
        className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary-container/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-container/10">
            <Icon name="restaurant_menu" size={20} className="text-primary-container" />
          </span>
          <div>
            <p className="font-bold text-on-surface">Mi negocio</p>
            <p className="text-xs text-on-surface-variant">Editar catálogo, precios e imágenes</p>
          </div>
        </div>
        <Icon name="arrow_forward" size={18} className="text-on-surface-variant" />
      </Link>

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
            Pedidos activos
          </h2>
        </div>
        <ActiveOrders />
      </section>
    </main>
  )
}
