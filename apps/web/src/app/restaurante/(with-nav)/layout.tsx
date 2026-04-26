'use client'
import { fullSignOut } from '@/features/auth/services/sign-out'
import { BottomNav, type BottomNavItem, GlassTopBar, IconButton } from '@tindivo/ui'
import { Icon } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

const navItems: BottomNavItem[] = [
  { href: '/restaurante', label: 'Inicio', icon: 'home' },
  { href: '/restaurante/efectivo', label: 'Efectivo', icon: 'payments' },
  { href: '/restaurante/historial', label: 'Historial', icon: 'history' },
  { href: '/restaurante/deuda', label: 'Deuda', icon: 'account_balance_wallet' },
  { href: '/restaurante/perfil', label: 'Perfil', icon: 'person' },
]

export default function RestauranteLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  async function logout() {
    await fullSignOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen pb-28">
      <GlassTopBar
        title="TINDIVO"
        subtitle="Restaurante"
        right={
          <IconButton variant="ghost" onClick={logout} aria-label="Cerrar sesión">
            <Icon name="logout" />
          </IconButton>
        }
      />
      {children}
      <BottomNav items={navItems} />
    </div>
  )
}
