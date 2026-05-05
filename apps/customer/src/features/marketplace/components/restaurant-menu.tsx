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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Icon name="progress_activity" size={36} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="px-4 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-container-lowest border border-outline-variant/30 px-4 py-2 text-sm font-bold"
      >
        <Icon name="arrow_back" size={18} />
        Locales
      </button>

      <section className="rounded-[32px] overflow-hidden bg-surface-container-lowest border border-outline-variant/20 mb-5">
        <div
          className="h-36 relative"
          style={{
            background: `linear-gradient(135deg, #${data.restaurant.accentColor} 0%, #ff8c42 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.34),transparent_34%)]" />
          <div className="absolute left-5 bottom-5 text-white">
            <p className="text-xs font-bold tracking-[0.22em] uppercase opacity-85">
              Delivery Tindivo
            </p>
            <h1 className="text-3xl font-black tracking-normal">{data.restaurant.name}</h1>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-on-surface-variant">{data.restaurant.address}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {data.categories.map((category) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="shrink-0 rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface"
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
            <h2 className="px-1 text-xl font-black text-on-surface">{category.name}</h2>
            {category.description && (
              <p className="px-1 mt-1 text-sm text-on-surface-variant">{category.description}</p>
            )}
            <div className="mt-3 space-y-3">
              {category.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full rounded-[24px] bg-surface-container-lowest border border-outline-variant/15 p-3 flex gap-3 text-left shadow-[0_4px_20px_rgba(171,53,0,0.04)] active:scale-[0.99] transition-transform"
                >
                  <div className="h-24 w-24 rounded-[20px] overflow-hidden shrink-0 bg-surface-container">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary-fixed">
                        <Icon name="local_dining" size={30} className="text-on-primary-fixed" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-on-surface leading-tight">{item.name}</h3>
                      <span className="font-black text-primary-container whitespace-nowrap">
                        S/ {item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.modifierGroups.length > 0 && (
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-container">
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
