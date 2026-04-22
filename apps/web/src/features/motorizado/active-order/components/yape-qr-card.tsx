'use client'
import { Icon } from '@tindivo/ui'
import { useState } from 'react'

type Props = {
  qrUrl: string | null
  yapeNumber: string | null
  amount: number
  restaurantName: string
}

/**
 * Card que se muestra al motorizado cuando va a entregar un pedido pagado
 * con Yape/Plin pendiente. Expone el QR del restaurante (subido por admin)
 * para que el cliente lo escanee y complete el pago en la puerta.
 *
 * Incluye botón "Ver más grande" que abre el QR en fullscreen para mejor
 * escaneabilidad en cualquier condición de luz.
 */
export function YapeQrCard({ qrUrl, yapeNumber, amount, restaurantName }: Props) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <>
      <section
        className="relative overflow-hidden rounded-[24px] p-5"
        style={{
          background: 'linear-gradient(135deg, #5E00B8 0%, #7B1FA2 60%, #9B27B0 100%)',
          color: '#ffffff',
          boxShadow: '0 16px 40px -12px rgba(94, 0, 184, 0.55)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 60%)',
          }}
        />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.18)' }}
            >
              <Icon name="qr_code_2" size={22} filled />
            </span>
            <div>
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-85">
                Yape al cliente
              </div>
              <div className="font-black text-lg leading-tight">
                Cobrar S/ {amount.toFixed(2)}
              </div>
            </div>
          </div>

          {qrUrl ? (
            <>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="block w-full rounded-2xl overflow-hidden bg-white p-3 active:scale-[0.98] transition-transform"
                aria-label="Ver QR en pantalla completa"
              >
                <div className="relative" style={{ aspectRatio: '1 / 1' }}>
                  <img
                    src={qrUrl}
                    alt={`QR Yape de ${restaurantName}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(255, 255, 255, 0.18)' }}
              >
                <Icon name="fullscreen" size={16} />
                Ver más grande
              </button>
            </>
          ) : (
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255, 255, 255, 0.15)' }}
            >
              <Icon name="info" size={20} />
              <p className="mt-2 text-sm font-semibold">QR no disponible para este restaurante.</p>
              {yapeNumber && (
                <p className="text-xs opacity-90 mt-1">
                  Cobra manualmente al número: <span className="font-mono font-bold">+51 {yapeNumber}</span>
                </p>
              )}
            </div>
          )}

          {yapeNumber && qrUrl && (
            <div
              className="text-center text-xs py-2 rounded-lg"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <span className="opacity-85">Nº de cuenta: </span>
              <span className="font-mono font-bold">+51 {yapeNumber}</span>
            </div>
          )}
        </div>
      </section>

      {fullscreen && qrUrl && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.92)' }}
          aria-label="Cerrar QR"
        >
          <img
            src={qrUrl}
            alt={`QR Yape de ${restaurantName}`}
            className="w-full max-w-lg aspect-square object-contain rounded-2xl bg-white p-4"
          />
          <span
            aria-hidden="true"
            className="absolute top-6 right-6 inline-flex items-center justify-center w-12 h-12 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.16)', color: '#ffffff' }}
          >
            <Icon name="close" size={28} />
          </span>
          <span
            aria-hidden="true"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-xs uppercase tracking-[0.2em] font-bold"
          >
            Toca para cerrar
          </span>
        </button>
      )}
    </>
  )
}
