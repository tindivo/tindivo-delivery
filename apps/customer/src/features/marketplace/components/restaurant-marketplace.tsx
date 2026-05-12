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
  const openCount = restaurants.filter((restaurant) => restaurant.isOpen).length

  return (
    <div className="px-4 pb-8 md:px-6">
      <section className="customer-soft-gradient customer-fade-up relative mb-6 overflow-hidden rounded-[36px] px-5 py-7 text-white md:px-10 md:py-10">
        <div className="customer-subtle-grid absolute inset-0 opacity-35" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/12 to-transparent" />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div className="max-w-[18rem] min-[380px]:max-w-[20rem] md:max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-extrabold uppercase backdrop-blur">
              <Icon name="location_on" size={16} filled />
              San Jacinto
            </div>
            <h1 className="mt-4 text-[2rem] font-black leading-[1.05] tracking-normal min-[380px]:text-[2.15rem] md:text-6xl md:leading-[0.98]">
              Elige tu antojo, nosotros lo llevamos.
            </h1>
            <p className="mt-4 max-w-md text-base font-semibold text-white/90">
              Restaurantes cercanos, carta clara y seguimiento en tiempo real desde el primer toque.
            </p>
          </div>

          <div className="customer-glass flex items-center gap-4 rounded-[28px] p-4 text-[#4b210f] md:flex-col md:items-start">
            <img
              src="/icon.svg"
              alt="Tindivo"
              className="h-16 w-16 rounded-[22px] bg-white object-contain p-1"
            />
            <div>
              <p className="text-3xl font-black leading-none">{openCount}</p>
              <p className="mt-1 text-sm font-extrabold">locales abiertos ahora</p>
            </div>
          </div>
        </div>
      </section>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`customer-lift h-11 shrink-0 rounded-full border px-4 text-sm font-extrabold ${
              activeCategory === category
                ? 'border-on-surface bg-on-surface text-white'
                : 'border-white/70 bg-white/78 text-on-surface backdrop-blur'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="h-52 animate-pulse rounded-[28px] bg-white/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="customer-panel rounded-[32px] px-6 py-16 text-center text-on-surface-variant">
          <Icon name="storefront" size={44} className="mx-auto mb-3 opacity-45" />
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
              className="customer-lift customer-panel overflow-hidden rounded-[30px] text-left"
            >
              <div
                className="relative h-32"
                style={{
                  background: `linear-gradient(135deg, #${restaurant.accentColor} 0%, #ff8c42 52%, #ffd166 100%)`,
                }}
              >
                <div className="customer-subtle-grid absolute inset-0 opacity-25" />
                <img
                  src="/icon.svg"
                  alt=""
                  className="absolute right-4 top-4 h-16 w-16 rounded-[22px] bg-white/86 object-contain p-1 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.7)]"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/88 px-3 py-1.5 text-xs font-black text-on-surface backdrop-blur">
                    <Icon
                      name={
                        restaurant.deliveryEnabled
                          ? restaurant.isOpen
                            ? 'bolt'
                            : 'schedule'
                          : 'storefront'
                      }
                      size={14}
                      filled
                    />
                    {restaurant.deliveryEnabled
                      ? restaurant.isOpen
                        ? 'Delivery'
                        : 'Cerrado'
                      : 'Catalogo'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-black leading-tight text-on-surface">
                  {restaurant.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                  {restaurant.address}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {restaurant.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant"
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
