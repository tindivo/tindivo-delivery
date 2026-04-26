'use client'
import { fullSignOut } from '@/features/auth/services/sign-out'
import { GlassTopBar, Icon, IconButton } from '@tindivo/ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'

const items = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/orders', label: 'Pedidos', icon: 'receipt_long' },
  { href: '/admin/tracking', label: 'Envío tracking', icon: 'chat' },
  { href: '/admin/restaurants', label: 'Restaurantes', icon: 'restaurant' },
  { href: '/admin/drivers', label: 'Motorizados', icon: 'two_wheeler' },
  { href: '/admin/cobros', label: 'Cobros', icon: 'payments' },
  { href: '/admin/finance', label: 'Disputas', icon: 'gavel' },
  { href: '/admin/audit', label: 'Auditoría', icon: 'fact_check' },
  { href: '/admin/settings', label: 'Configuración', icon: 'settings' },
] as const

/**
 * Shell del rol admin: sidebar fijo en desktop (≥lg), GlassTopBar + drawer en
 * mobile/tablet. El logout está siempre accesible (sidebar en desktop, top
 * bar en móvil). Cierra el drawer automáticamente al navegar.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Cierra el drawer al cambiar de ruta para que no quede pegado tras navegar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname es el trigger intencional aunque no se use dentro
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Bloquea el scroll del body cuando el drawer está abierto.
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [drawerOpen])

  async function logout() {
    await fullSignOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar fijo — solo visible en desktop. */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant/15 min-h-screen flex-col">
        <div className="p-6 border-b border-outline-variant/15">
          <div className="font-black tracking-tighter uppercase text-lg text-primary">
            TINDIVO <span className="text-xs font-medium">Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="p-3 border-t border-outline-variant/15">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant hover:bg-error-container/40 hover:text-error transition-colors"
          >
            <Icon name="logout" size={20} />
            Cerrar sesión
          </button>
        </div>
        <div className="p-4 text-xs text-on-surface-variant">
          © {new Date().getFullYear()} Tindivo
        </div>
      </aside>

      {/* GlassTopBar — solo visible en móvil/tablet. */}
      <div className="lg:hidden">
        <GlassTopBar
          title="TINDIVO"
          subtitle="Admin"
          left={
            <IconButton variant="ghost" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
              <Icon name="menu" />
            </IconButton>
          }
          right={
            <IconButton variant="ghost" onClick={logout} aria-label="Cerrar sesión">
              <Icon name="logout" />
            </IconButton>
          }
        />
      </div>

      {/* Drawer overlay — solo móvil/tablet. */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}
      <aside
        aria-hidden={!drawerOpen}
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-[70] w-72 max-w-[85vw] bg-surface-container-lowest border-r border-outline-variant/15 flex flex-col shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between">
          <div className="font-black tracking-tighter uppercase text-lg text-primary">
            TINDIVO <span className="text-xs font-medium">Admin</span>
          </div>
          <IconButton variant="ghost" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
            <Icon name="close" />
          </IconButton>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="p-3 border-t border-outline-variant/15">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant hover:bg-error-container/40 hover:text-error transition-colors"
          >
            <Icon name="logout" size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content — padding responsivo y top padding para el GlassTopBar móvil. */}
      <main className="flex-1 min-w-0 p-4 pt-24 md:p-6 md:pt-24 lg:p-8 lg:pt-8">{children}</main>
    </div>
  )
}

function SidebarLink({
  item,
  pathname,
}: {
  item: { href: string; label: string; icon: string }
  pathname: string
}) {
  // Para el dashboard ('/admin') solo matchea exacto, sino "Dashboard" se
  // marcaría activo en TODAS las subrutas /admin/* (porque toda url empieza
  // por '/admin/'). Para los demás items el prefix match es correcto: ej.
  // /admin/orders/historial activa "Pedidos".
  const active =
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  return (
    <Link
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
}
