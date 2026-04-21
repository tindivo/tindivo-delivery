'use client'
import { Icon } from '@tindivo/ui'
import { usePushSubscription } from '../hooks/use-push-subscription'

/**
 * Card para activar/desactivar push notifications desde el perfil.
 * Se muestra solo si el browser soporta Web Push.
 */
export function PushToggleCard() {
  const { status, loading, subscribe, unsubscribe } = usePushSubscription()

  if (status === 'unsupported') return null

  const isOn = status === 'subscribed'

  return (
    <section
      className="relative overflow-hidden rounded-[24px] p-5"
      style={{
        background: isOn
          ? 'linear-gradient(135deg, #065F46 0%, #10B981 100%)'
          : 'rgba(255, 255, 255, 0.9)',
        color: isOn ? '#ffffff' : '#1a1c1b',
        border: isOn ? 'none' : '1px solid rgba(225, 191, 181, 0.2)',
        boxShadow: isOn
          ? '0 12px 28px -12px rgba(5, 150, 105, 0.45)'
          : '0 4px 20px rgba(171, 53, 0, 0.04)',
      }}
    >
      {isOn && (
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
          }}
        />
      )}
      <div className="relative">
        <div
          className="text-[10px] font-bold tracking-[0.24em] uppercase mb-2"
          style={{ opacity: isOn ? 0.85 : 0.6 }}
        >
          Notificaciones push
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: isOn ? 'rgba(255,255,255,0.2)' : 'rgba(255, 107, 53, 0.12)',
                color: isOn ? '#ffffff' : '#AB3500',
                backdropFilter: isOn ? 'blur(10px)' : 'none',
              }}
            >
              <Icon name={isOn ? 'notifications_active' : 'notifications'} size={24} filled />
            </span>
            <div className="min-w-0">
              <div className="font-bold" style={{ letterSpacing: '-0.01em' }}>
                {isOn ? 'Activadas' : 'Desactivadas'}
              </div>
              <div className="text-[11px]" style={{ opacity: isOn ? 0.85 : 0.6 }}>
                {isOn
                  ? 'Recibes alertas aunque la app esté cerrada'
                  : status === 'denied'
                    ? 'Permiso bloqueado — ajústalo en tu navegador'
                    : 'Enciéndelas para no perder ningún pedido'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={isOn ? unsubscribe : subscribe}
            disabled={loading || status === 'denied'}
            aria-label={isOn ? 'Desactivar notificaciones' : 'Activar notificaciones'}
            className="relative shrink-0 transition-transform active:scale-95 disabled:opacity-50"
            style={{
              width: '60px',
              height: '34px',
              borderRadius: '999px',
              background: isOn ? 'rgba(255,255,255,0.3)' : 'rgba(171, 53, 0, 0.12)',
              border: isOn
                ? '1.5px solid rgba(255,255,255,0.5)'
                : '1.5px solid rgba(225, 191, 181, 0.4)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '3px',
                left: isOn ? '29px' : '3px',
                width: '25px',
                height: '25px',
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
  )
}
