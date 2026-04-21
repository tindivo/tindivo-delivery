'use client'
import { Button, Icon, Skeleton } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { PushToggleCard } from '@/features/pwa/components/push-toggle-card'
import { supabase } from '@/lib/supabase/client'
import { useDriverProfile } from '../hooks/use-driver-profile'
import { useToggleAvailability } from '../hooks/use-toggle-availability'

const VEHICLE_ICONS: Record<string, string> = {
  moto: 'two_wheeler',
  bicicleta: 'pedal_bike',
  pie: 'directions_walk',
  auto: 'directions_car',
}

const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  bicicleta: 'Bicicleta',
  pie: 'A pie',
  auto: 'Auto',
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom',
}

export function DriverProfileView() {
  const router = useRouter()
  const { data, isLoading } = useDriverProfile()
  const toggle = useToggleAvailability()

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  async function handleLogout() {
    if (!confirm('¿Cerrar sesión?')) return
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="space-y-5">
      {/* Availability toggle hero */}
      <section
        className="relative overflow-hidden rounded-[24px] p-5"
        style={{
          background: data.isAvailable
            ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)'
            : 'linear-gradient(135deg, #3F3F46 0%, #52525B 100%)',
          color: '#ffffff',
          boxShadow: data.isAvailable
            ? '0 16px 40px -12px rgba(255, 107, 53, 0.5)'
            : '0 12px 28px -12px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
          }}
        />
        <div className="relative">
          <div className="text-[10px] font-bold tracking-[0.24em] uppercase opacity-80 mb-2">
            Disponibilidad
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: '46px',
                  height: '46px',
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Icon name={data.isAvailable ? 'toggle_on' : 'toggle_off'} size={26} filled />
              </span>
              <div>
                <div className="font-black text-xl" style={{ letterSpacing: '-0.02em' }}>
                  {data.isAvailable ? 'Disponible' : 'No disponible'}
                </div>
                <div className="text-xs opacity-85 mt-0.5">
                  {data.isAvailable
                    ? 'Recibirás pedidos nuevos'
                    : 'No recibirás pedidos nuevos'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggle.mutate(!data.isAvailable)}
              disabled={toggle.isPending}
              aria-label={data.isAvailable ? 'Desactivar disponibilidad' : 'Activar disponibilidad'}
              className="relative shrink-0 transition-transform active:scale-95"
              style={{
                width: '68px',
                height: '38px',
                borderRadius: '999px',
                background: data.isAvailable ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
                border: '1.5px solid rgba(255,255,255,0.45)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: data.isAvailable ? '33px' : '3px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  transition: 'left 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Datos personales */}
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
        <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-on-surface-variant mb-4">
          Tus datos
        </div>
        <dl className="space-y-4">
          <Row icon="person" label="Nombre" value={data.fullName} />
          <Row icon="mail" label="Email" value={data.email} />
          <Row icon="phone" label="Teléfono" value={`+51 ${data.phone}`} />
          <Row
            icon={VEHICLE_ICONS[data.vehicleType] ?? 'two_wheeler'}
            label="Vehículo"
            value={
              VEHICLE_LABELS[data.vehicleType] +
              (data.licensePlate ? ` · ${data.licensePlate}` : '')
            }
          />
        </dl>
      </section>

      {/* Horario */}
      <section className="rounded-[24px] p-5 bg-surface-container-lowest border border-outline-variant/15 shadow-[0_4px_20px_rgba(171,53,0,0.04)]">
        <div className="text-[10px] font-bold tracking-[0.24em] uppercase text-on-surface-variant mb-4">
          Horario
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => {
            const on = data.operatingDays.includes(d)
            return (
              <span
                key={d}
                className="text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: on ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)' : 'rgba(225,191,181,0.2)',
                  color: on ? '#ffffff' : '#594139',
                  boxShadow: on ? '0 4px 10px rgba(255,107,53,0.3)' : 'none',
                }}
              >
                {DAY_LABELS[d]}
              </span>
            )
          })}
        </div>
        <div className="text-sm text-on-surface-variant flex items-center gap-2">
          <Icon name="schedule" size={16} />
          {data.shiftStart.slice(0, 5)} — {data.shiftEnd.slice(0, 5)}
        </div>
      </section>

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
