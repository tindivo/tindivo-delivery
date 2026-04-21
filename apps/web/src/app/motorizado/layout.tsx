'use client'
import { BottomNav, type BottomNavItem, GlassTopBar, Icon, IconButton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'

const navItems: BottomNavItem[] = [
  { href: '/motorizado', label: 'Pedidos', icon: 'receipt_long' },
  { href: '/motorizado/efectivo', label: 'Efectivo', icon: 'payments' },
  { href: '/motorizado/historial', label: 'Historial', icon: 'history' },
  { href: '/motorizado/perfil', label: 'Perfil', icon: 'person' },
]

export default function MotorizadoLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen pb-28">
      <GlassTopBar
        title="TINDIVO"
        subtitle="Motorizado"
        left={
          <IconButton variant="ghost" aria-label="Mi perfil" asChild>
            <Link href="/motorizado/perfil">
              <Icon name="person" />
            </Link>
          </IconButton>
        }
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
