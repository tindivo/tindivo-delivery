'use client'
import { Icon } from '@tindivo/ui'
import Link from 'next/link'
import { useDriverActiveOrders } from '../hooks/use-driver-active-orders'

export function ActiveOrderBanner() {
  const { data } = useDriverActiveOrders()
  const active = data?.items?.[0] as any
  if (!active) return null

  return (
    <Link
      href={`/motorizado/pedidos/${active.id}`}
      className="block bg-primary-container text-on-primary rounded-lg p-5 shadow-[0_10px_40px_rgba(255,107,53,0.25)] transition-transform duration-200 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center">
          <Icon name="delivery_dining" size={28} filled />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Pedido activo</p>
          <p className="font-bold text-lg truncate">
            {active.restaurants?.name ?? 'Restaurante'}
          </p>
          <p className="text-xs opacity-90">#{active.short_id} · toca para continuar</p>
        </div>
        <Icon name="arrow_forward" size={24} />
      </div>
    </Link>
  )
}
