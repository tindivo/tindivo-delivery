'use client'
import type { Customer } from '@tindivo/contracts'
import { Icon } from '@tindivo/ui'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6']

type Props = {
  restaurants: Customer.PublicRestaurantSummary[]
  loading: boolean
  onSelect: (id: string) => void
}

export function RestaurantMarketplace({ restaurants, loading, onSelect }: Props) {
  const categories = useMemo(() => {
    const names = new Set<string>()
    for (const restaurant of restaurants) {
      for (const category of restaurant.categories) names.add(category)
    }
    return ['Todos', ...Array.from(names).slice(0, 8)]
  }, [restaurants])
  const [activeCategory, setActiveCategory] = useState('Todos')
  const visible =
    activeCategory === 'Todos'
      ? restaurants
      : restaurants.filter((restaurant) => restaurant.categories.includes(activeCategory))

  return (
    <div className="px-4 pb-8">
      <section className="relative overflow-hidden rounded-[32px] px-5 py-7 md:px-10 md:py-10 mb-6">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(171,53,0,0.96) 0%, rgba(255,107,53,0.92) 55%, rgba(255,140,66,0.9) 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.45) 0, transparent 26%), radial-gradient(circle at 90% 70%, rgba(255,255,255,0.28) 0, transparent 30%)',
          }}
        />
        <div className="relative max-w-xl text-white">
          <p className="text-xs font-bold tracking-[0.24em] uppercase opacity-85">
            Zona de cobertura
          </p>
          <h1 className="mt-3 text-4xl md:text-6xl font-black leading-[0.92] tracking-normal">
            Que comer hoy en San Jacinto
          </h1>
          <p className="mt-4 text-sm md:text-base opacity-90 max-w-md">
            Elige tu local, arma tu pedido y Tindivo lo lleva a tu direccion.
          </p>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold border transition-colors ${
              activeCategory === category
                ? 'bg-on-surface text-white border-on-surface'
                : 'bg-surface-container-lowest text-on-surface border-outline-variant/30'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="h-40 rounded-[28px] bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-on-surface-variant">
          No hay locales con carta disponible todavia.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((restaurant, index) => (
            <motion.button
              key={restaurant.id}
              type="button"
              onClick={() => onSelect(restaurant.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="text-left rounded-[28px] bg-surface-container-lowest border border-outline-variant/20 overflow-hidden active:scale-[0.99] transition-transform shadow-[0_4px_20px_rgba(171,53,0,0.04)]"
            >
              <div
                className="h-28 relative"
                style={{
                  background: `linear-gradient(135deg, #${restaurant.accentColor} 0%, #ff8c42 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.35),transparent_32%)]" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/88 px-3 py-1 text-xs font-black text-on-surface">
                    <Icon name={restaurant.isOpen ? 'bolt' : 'schedule'} size={14} filled />
                    {restaurant.isOpen ? 'Abierto' : 'Cerrado'}
                  </span>
                  <Icon name="restaurant" size={30} className="text-white/85" filled />
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-black text-on-surface">{restaurant.name}</h2>
                <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">
                  {restaurant.address}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {restaurant.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-bold text-on-surface-variant"
                    >
                      {category}
                    </span>
                  ))}
                </div>
                {restaurant.featuredItemNames.length > 0 && (
                  <p className="mt-3 text-xs font-semibold text-on-surface">
                    {restaurant.featuredItemNames.join(' · ')}
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
