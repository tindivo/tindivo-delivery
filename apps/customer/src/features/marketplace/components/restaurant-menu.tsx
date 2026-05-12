'use client'
import type { Customer } from '@tindivo/contracts'
import { Icon } from '@tindivo/ui'

type Props = {
  data: Customer.PublicRestaurantMenu | null
  loading: boolean
  onBack: () => void
  onSelectItem: (item: Customer.MenuItem) => void
}

export function RestaurantMenu({ data, loading, onBack, onSelectItem }: Props) {
  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="px-4 pb-8 md:px-6">
      <div className="sticky top-[74px] z-20 mb-4 flex justify-start">
        <button
          type="button"
          onClick={onBack}
          className="customer-lift customer-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold text-on-surface"
        >
          <Icon name="arrow_back" size={18} />
          Locales
        </button>
      </div>

      <section className="customer-panel mb-5 overflow-hidden rounded-[34px]">
        <div
          className="customer-soft-gradient relative min-h-52 md:min-h-72"
          style={{
            background: `linear-gradient(135deg, #${data.restaurant.accentColor} 0%, #ff8c42 54%, #ffd166 100%)`,
          }}
        >
          <div className="customer-subtle-grid absolute inset-0 opacity-30" />
          <img
            src="/icon.svg"
            alt=""
            className="absolute right-5 top-5 h-16 w-16 rounded-[22px] bg-white/88 object-contain p-1"
          />
          <div className="absolute bottom-5 left-5 right-5 text-white md:right-48">
            <p className="customer-chip w-fit text-[#4b210f]">
              <Icon
                name={data.restaurant.deliveryEnabled ? 'delivery_dining' : 'storefront'}
                size={16}
                filled
              />
              {data.restaurant.deliveryEnabled ? 'Delivery Tindivo' : 'Catalogo publico'}
            </p>
            <h1 className="mt-3 text-3xl font-black leading-[1.02] tracking-normal md:text-5xl">
              {data.restaurant.name}
            </h1>
          </div>
        </div>
        <div className="p-5 md:flex md:items-start md:justify-between md:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface-variant">
              {data.restaurant.address}
            </p>
            {!data.restaurant.deliveryEnabled && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800">
                <Icon name="storefront" size={15} filled />
                Catalogo informativo, sin delivery Tindivo
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:mt-0 md:max-w-[52%]">
            {data.categories.map((category) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="customer-lift shrink-0 rounded-full bg-surface-container px-3 py-2 text-xs font-extrabold text-on-surface"
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-7">
        {data.categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-24">
            <h2 className="px-1 text-2xl font-black text-on-surface">{category.name}</h2>
            {category.description && (
              <p className="px-1 mt-1 text-sm text-on-surface-variant">{category.description}</p>
            )}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {category.items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="customer-lift customer-panel-soft customer-reveal flex w-full gap-3 rounded-[26px] p-3 text-left"
                  style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[22px] bg-surface-container shadow-[0_14px_34px_-28px_rgba(34,20,14,0.8)]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary-fixed">
                        <Icon name="local_dining" size={30} className="text-on-primary-fixed" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-black leading-tight text-on-surface">
                        {item.name}
                      </h3>
                      <span className="font-black text-primary-container whitespace-nowrap">
                        S/ {item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                        {item.description}
                      </p>
                    )}
                    {item.modifierGroups.length > 0 && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-1 text-xs font-black uppercase text-on-primary-fixed">
                        <Icon name="tune" size={14} />
                        Personalizable
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
