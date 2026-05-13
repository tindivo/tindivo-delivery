'use client'
import { Icon } from '@tindivo/ui'
import type { ReactNode } from 'react'

export function ChartCard({
  title,
  subtitle,
  icon,
  right,
  children,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-[0_4px_20px_rgba(171,53,0,0.04)] md:p-6 ${className ?? ''}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-[0.02em] text-on-surface">
            {icon && <Icon name={icon} size={18} />}
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  )
}
