'use client'
import { Icon } from '@tindivo/ui'

type Props = {
  count: number
}

/**
 * Card de "ALERTA: pedidos urgentes" que aparece arriba de la lista cuando
 * hay 1+ pedidos del restaurante con prep_time vencido y SIN driver asignado.
 *
 * UX: el restaurante necesita escalar a Tindivo para que coordinen un driver
 * manualmente. El número se lee de `NEXT_PUBLIC_TINDIVO_PHONE` (formato sin
 * +51, p.ej. "987654321"). Si no está configurado se muestra el botón pero
 * sin link `tel:` — el dueño verá la alerta y sabrá que debe contactar a
 * soporte por otro canal.
 */
export function UrgentCallCard({ count }: Props) {
  if (count === 0) return null

  const phone = process.env.NEXT_PUBLIC_TINDIVO_PHONE?.replace(/\D/g, '') ?? ''
  const hasPhone = phone.length >= 9

  const label = count === 1 ? '1 pedido sin driver' : `${count} pedidos sin driver`

  return (
    <section
      className="tindivo-overdue-glow relative overflow-hidden rounded-[24px] p-5"
      style={{
        background: 'linear-gradient(135deg, #BA1A1A 0%, #DC2626 100%)',
        color: '#ffffff',
        boxShadow: '0 12px 32px -10px rgba(186, 26, 26, 0.55)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex items-start gap-3">
        <span
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
          style={{ background: 'rgba(255, 255, 255, 0.22)' }}
        >
          <Icon name="priority_high" size={24} filled />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-90">
            Atención urgente
          </div>
          <div className="font-black text-lg leading-tight mt-0.5">{label}</div>
          <p className="text-xs opacity-90 mt-1 leading-snug">
            El tiempo de preparación venció y aún no hay un motorizado asignado. Llama a Tindivo
            para que coordinemos uno de inmediato.
          </p>
        </div>
      </div>

      <a
        href={hasPhone ? `tel:+51${phone}` : undefined}
        aria-disabled={!hasPhone}
        onClick={(e) => {
          if (!hasPhone) e.preventDefault()
        }}
        className="relative mt-4 w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-bold tracking-wide transition-all duration-300 active:scale-95"
        style={{
          background: '#ffffff',
          color: '#991B1B',
          boxShadow: '0 6px 20px -4px rgba(0,0,0,0.2)',
          opacity: hasPhone ? 1 : 0.7,
          pointerEvents: hasPhone ? 'auto' : 'none',
        }}
      >
        <Icon name="call" size={20} filled />
        {hasPhone ? 'Llamar a Tindivo' : 'Contacta a soporte Tindivo'}
      </a>
    </section>
  )
}
