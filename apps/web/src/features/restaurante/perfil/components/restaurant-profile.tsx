'use client'
import { fullSignOut } from '@/features/auth/services/sign-out'
import { PushToggleCard } from '@/features/pwa/components/push-toggle-card'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useRestaurantProfile } from '../hooks/use-restaurant-profile'

export function RestaurantProfileView() {
  const router = useRouter()
  const { data, isLoading } = useRestaurantProfile()

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-60" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await fullSignOut()
    router.replace('/login')
  }

  return (
    <div className="space-y-5">
      {/* Hero con accent color */}
      <section
        className="relative overflow-hidden rounded-[24px] p-6"
        style={{
          background: `linear-gradient(135deg, #${data.accentColor} 0%, #${data.accentColor}dd 100%)`,
          color: '#ffffff',
          boxShadow: `0 16px 40px -12px #${data.accentColor}80`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="text-[10px] font-bold tracking-[0.24em] uppercase opacity-85 mb-2">
            Tu restaurante
          </div>
          <div className="bleed-text text-3xl font-black" style={{ letterSpacing: '-0.03em' }}>
            {data.name}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs opacity-90">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
            >
              <Icon name="palette" size={12} />
              Color #{data.accentColor}
            </span>
          </div>
        </div>
      </section>

      {/* Datos */}
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
        <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-on-surface-variant mb-4">
          Tus datos
        </div>
        <dl className="space-y-4">
          <Row icon="storefront" label="Nombre" value={data.name} />
          <Row icon="location_on" label="Dirección" value={data.address} />
          <Row icon="phone" label="Teléfono" value={`+51 ${data.phone}`} />
          <Row icon="mail" label="Email" value={data.email} />
          {data.yapeNumber && <Row icon="qr_code_2" label="Yape" value={data.yapeNumber} />}
        </dl>
      </section>

      {/* Balance */}
      {data.balanceDue > 0 && (
        <section
          className="rounded-[24px] p-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(180, 83, 9, 0.12) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #B45309 0%, #EA580C 100%)',
                color: '#ffffff',
              }}
            >
              <Icon name="account_balance_wallet" size={22} filled />
            </span>
            <div className="flex-1">
              <div className="text-[10px] font-bold tracking-wider uppercase text-amber-800">
                Deuda acumulada
              </div>
              <div className="font-black text-xl text-amber-900">
                S/ {data.balanceDue.toFixed(2)}
              </div>
            </div>
          </div>
        </section>
      )}

      <PushToggleCard />

      {/* Logout */}
      <Button variant="secondary" size="lg" className="w-full" onClick={handleLogout}>
        <Icon name="logout" />
        Cerrar sesión
      </Button>
    </div>
  )
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant">
        <Icon name={icon} size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <dt className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant">
          {label}
        </dt>
        <dd className="font-semibold text-on-surface truncate">{value}</dd>
      </div>
    </div>
  )
}
