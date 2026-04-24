'use client'
import { Icon } from '@tindivo/ui'

export type TabKey = 'pending' | 'overdue' | 'paid' | 'by_restaurant'

type Tab = {
  key: TabKey
  label: string
  icon: string
  count?: number
  amount?: number
}

type Props = {
  active: TabKey
  onChange: (key: TabKey) => void
  tabs: Tab[]
}

export function CollectionsTabs({ active, onChange, tabs }: Props) {
  return (
    <div
      role="tablist"
      className="flex flex-wrap gap-2 rounded-2xl bg-surface-container-low/60 p-2 border border-outline-variant/15"
    >
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-white text-on-surface font-bold shadow-sm border border-outline-variant/20'
                : 'text-on-surface-variant hover:bg-white/60'
            }`}
          >
            <Icon name={t.icon} size={16} />
            <span>{t.label}</span>
            {typeof t.count === 'number' && (
              <span
                className={`text-xs font-mono ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                ({t.count})
              </span>
            )}
            {typeof t.amount === 'number' && t.amount > 0 && (
              <span className="text-xs font-mono text-on-surface-variant">
                — S/ {t.amount.toFixed(2)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
