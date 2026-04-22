'use client'
import { Icon } from '@tindivo/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/orders', label: 'Pedidos', icon: 'receipt_long' },
  { href: '/admin/tracking', label: 'Envío tracking', icon: 'chat' },
  { href: '/admin/restaurants', label: 'Restaurantes', icon: 'restaurant' },
  { href: '/admin/drivers', label: 'Motorizados', icon: 'two_wheeler' },
  { href: '/admin/finance', label: 'Finanzas', icon: 'account_balance' },
  { href: '/admin/audit', label: 'Auditoría', icon: 'fact_check' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant/15 min-h-screen flex flex-col">
      <div className="p-6 border-b border-outline-variant/15">
        <div className="font-black tracking-tighter uppercase text-lg text-primary">
          TINDIVO <span className="text-xs font-medium">Admin</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold bg-primary-container text-on-primary shadow-[0_4px_20px_rgba(255,107,53,0.2)]'
                  : 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors'
              }
            >
              <Icon name={item.icon} size={20} filled={active} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 text-xs text-on-surface-variant">
        © {new Date().getFullYear()} Tindivo
      </div>
    </aside>
  )
}
