import { RestaurantHistory } from '@/features/restaurante/historial/components/restaurant-history'

export default function RestauranteHistorialPage() {
  return (
    <main className="pt-24 pb-8 px-4 max-w-md mx-auto space-y-6">
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
            Historial de hoy
          </h2>
        </div>
        <RestaurantHistory />
      </section>
    </main>
  )
}
