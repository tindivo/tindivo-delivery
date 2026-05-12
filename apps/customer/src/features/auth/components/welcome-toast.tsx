'use client'
import { Icon } from '@tindivo/ui'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useCustomerAuth, useDisplayName } from '../hooks/use-customer-auth'

/**
 * Detecta transiciones `null → session` y muestra un toast tipo "diadema"
 * desde el top de la pantalla con saludo personalizado. Auto-dismiss tras
 * 3.2s. Se monta una sola vez en el CustomerApp/layout — escucha cambios
 * vía useCustomerAuth y dispara solo en LOGIN (no en logout, ni en reloads
 * con sesión preexistente).
 */
export function WelcomeToast() {
  const { session, loading } = useCustomerAuth()
  const { displayName } = useDisplayName()
  const [open, setOpen] = useState(false)
  const prevUserId = useRef<string | null>(null)
  const hasMounted = useRef(false)

  useEffect(() => {
    if (loading) return
    const current = session?.userId ?? null

    // En el primer render (con sesión preexistente del browser cache)
    // NO disparamos el toast — solo capturamos el estado actual.
    if (!hasMounted.current) {
      hasMounted.current = true
      prevUserId.current = current
      return
    }

    // Transición real null → session = login. Mostrar toast.
    if (current && prevUserId.current !== current) {
      setOpen(true)
      const timer = setTimeout(() => setOpen(false), 3200)
      prevUserId.current = current
      return () => clearTimeout(timer)
    }
    prevUserId.current = current
  }, [loading, session?.userId])

  const isBusiness = session?.roles.includes('business') ?? false
  const greetingName = displayName ?? session?.email?.split('@')[0] ?? ''
  const subtitle = isBusiness
    ? 'Tu panel de negocio te espera'
    : 'Tu cuenta esta lista. Pedi lo que quieras.'

  return (
    <AnimatePresence>
      {open && session && (
        <motion.div
          key="welcome-toast"
          initial={{ opacity: 0, y: -32, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.7 }}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-[max(env(safe-area-inset-top),12px)] z-[120] w-[min(92vw,420px)] -translate-x-1/2"
        >
          <div
            className="pointer-events-auto relative overflow-hidden rounded-[28px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_24px_64px_-32px_rgba(171,53,0,0.55)] backdrop-blur-2xl"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,246,237,0.88) 60%, rgba(255,235,217,0.92) 100%)',
            }}
          >
            {/* Glow lateral decorativo */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-8 h-32 w-32 rounded-full opacity-60 blur-2xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,140,66,0.45) 0%, rgba(255,140,66,0) 70%)',
              }}
            />

            <div className="relative flex items-center gap-3">
              <motion.span
                initial={{ rotate: -16, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.05 }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] text-white shadow-[0_12px_30px_-14px_rgba(171,53,0,0.7)]"
                style={{
                  background:
                    'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)',
                }}
              >
                <Icon name={isBusiness ? 'storefront' : 'celebration'} size={22} filled />
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-container">
                  Bienvenido
                </p>
                <p className="truncate text-base font-black leading-tight text-on-surface">
                  {greetingName || (isBusiness ? 'Tu negocio' : 'Cliente')}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-on-surface-variant">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Barra de progreso decorativa que indica auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3.2, ease: 'linear' }}
              className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-full origin-left rounded-b-[28px] bg-gradient-to-r from-primary-container via-[#ff8c42] to-[#ffa85c]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
