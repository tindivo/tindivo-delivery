'use client'
import { Icon } from '@tindivo/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTimeRange } from '../hooks/use-time-range'
import { RangePicker } from './range-picker'
import { SummaryBanner } from './summary-banner'
import { TabDrivers } from './tab-drivers'
import { TabOperations } from './tab-operations'
import { TabRestaurants } from './tab-restaurants'
import { TabSales } from './tab-sales'

type TabId = 'ventas' | 'motorizados' | 'restaurantes' | 'operacion'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ventas', label: 'Ventas', icon: 'trending_up' },
  { id: 'motorizados', label: 'Motorizados', icon: 'two_wheeler' },
  { id: 'restaurantes', label: 'Restaurantes', icon: 'restaurant' },
  { id: 'operacion', label: 'Operación', icon: 'speed' },
]

function isTabId(v: string | null): v is TabId {
  return v === 'ventas' || v === 'motorizados' || v === 'restaurantes' || v === 'operacion'
}

export function MetricsLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const tabParam = params.get('tab')
  const tab: TabId = isTabId(tabParam) ? tabParam : 'ventas'

  const range = useTimeRange()

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(params.toString())
    next.set('tab', id)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-black text-2xl tracking-tight text-on-surface md:text-3xl">
            Métricas del negocio
          </h1>
          <p className="mt-1 text-xs text-on-surface-variant md:text-sm">
            Analiza ventas, motorizados, restaurantes y operación en cualquier rango temporal.
          </p>
        </div>
        <RangePicker state={range} />
      </header>

      <SummaryBanner range={range} />

      <nav
        aria-label="Tabs de métricas"
        className="sticky top-2 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant/15 bg-white/85 p-1 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md md:gap-3"
      >
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-on-primary shadow-[0_4px_20px_rgba(180,60,31,0.2)]'
                  : 'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low'
              }
            >
              <Icon name={t.icon} size={18} filled={active} />
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'ventas' && <TabSales range={range} />}
      {tab === 'motorizados' && <TabDrivers range={range} />}
      {tab === 'restaurantes' && <TabRestaurants range={range} />}
      {tab === 'operacion' && <TabOperations range={range} />}
    </div>
  )
}
