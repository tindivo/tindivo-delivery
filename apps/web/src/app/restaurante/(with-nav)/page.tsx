import { ActiveOrders } from '@/features/restaurante/active-orders/components/active-orders'
import { SolarCTA } from '@tindivo/ui'

export default function RestauranteHome() {
  return (
    <main className="pt-24 pb-8 px-4 max-w-md mx-auto space-y-8">
      <SolarCTA
        href="/restaurante/nuevo-pedido"
        icon="two_wheeler"
        overline="Nuevo pedido"
        title="PEDIR MOTO"
        variant="solar"
      />

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
