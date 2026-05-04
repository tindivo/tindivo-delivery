'use client'
import { fullSignOut } from '@/features/auth/services/sign-out'
import { useCashSummary } from '@/features/motorizado/efectivo/hooks/use-cash-summary'
import { useDriverProfile } from '@/features/motorizado/perfil/hooks/use-driver-profile'
import { BottomNav, type BottomNavItem, GlassTopBar, Icon, IconButton } from '@tindivo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useMemo } from 'react'

export default function MotorizadoLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const profile = useDriverProfile()
  const cash = useCashSummary(profile.data?.id)

  // Cantidad de restaurantes con efectivo aún por devolver = filas de
  // /driver/cash-summary que tengan totalCash > 0 (incluye nuevos sin
  // declarar y ciclos delivered/disputed que el restaurante no confirmó).
  const pendingCashRestaurants = useMemo(() => {
    const items = cash.data?.items ?? []
    return items.filter((it) => Number(it.totalCash) > 0).length
  }, [cash.data])

  const navItems: BottomNavItem[] = useMemo(
    () => [
      { href: '/motorizado', label: 'Pedidos', icon: 'receipt_long' },
      {
        href: '/motorizado/efectivo',
        label: 'Efectivo',
        icon: 'payments',
        badge: pendingCashRestaurants,
      },
      { href: '/motorizado/historial', label: 'Historial', icon: 'history' },
      { href: '/motorizado/perfil', label: 'Perfil', icon: 'person' },
    ],
    [pendingCashRestaurants],
  )

  async function logout() {
    await fullSignOut()
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
