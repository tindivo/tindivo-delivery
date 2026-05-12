'use client'
import { Icon } from '@tindivo/ui'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCustomerAuth, useDisplayName } from '../hooks/use-customer-auth'
import { LoginRegisterSheet } from './login-register-sheet'

/**
 * Topbar action que cambia según el estado de auth:
 *  - Sin sesión: botón "Entrar" → abre LoginRegisterSheet.
 *  - Con sesión: pill con nombre + icono → link a /negocio (business)
 *    o /cuenta (customer). El nombre se elide al primer nombre en
 *    pantallas chicas para no saturar la barra.
 */
export function LoginButton() {
  const { session, loading } = useCustomerAuth()
  const { displayName, loading: nameLoading } = useDisplayName()
  const [showSheet, setShowSheet] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading) {
    return <div className="h-10 w-10" aria-hidden="true" />
  }

  if (session) {
    const isBusiness = session.roles.includes('business')
    const fullName = displayName ?? session.email.split('@')[0] ?? ''
    // En mobile (<sm) mostramos solo el primer nombre / palabra del negocio
    // para que no rompa el layout de la topbar.
    const shortName = fullName.split(' ')[0] ?? fullName
    return (
      <Link
        href={isBusiness ? '/negocio' : '/cuenta'}
        aria-label={`Mi cuenta: ${fullName}`}
        className="customer-lift group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full border border-white/70 bg-white/82 pl-1.5 pr-3 shadow-[0_10px_28px_-20px_rgba(171,53,0,0.8)] backdrop-blur transition-[box-shadow,transform] hover:shadow-[0_14px_38px_-20px_rgba(171,53,0,0.9)]"
      >
        <motion.span
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 280 }}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-10px_rgba(171,53,0,0.7)]"
          style={{
            background: isBusiness
              ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 55%, #FFA85C 100%)'
              : 'linear-gradient(135deg, #1f2937 0%, #374151 55%, #4b5563 100%)',
          }}
        >
          <Icon name={isBusiness ? 'storefront' : 'person'} size={16} filled />
        </motion.span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-on-surface-variant">
            {isBusiness ? 'Negocio' : 'Hola'}
          </span>
          <span
            className={`max-w-[120px] truncate text-sm font-black text-on-surface ${
              nameLoading ? 'animate-pulse opacity-60' : ''
            }`}
            aria-hidden={nameLoading ? 'true' : undefined}
          >
            <span className="sm:hidden">{shortName}</span>
            <span className="hidden sm:inline">{fullName}</span>
          </span>
        </span>
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowSheet(true)}
        className="customer-lift customer-login-button inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/80 text-sm font-extrabold text-on-surface shadow-[0_10px_28px_-20px_rgba(171,53,0,0.8)] backdrop-blur sm:w-auto sm:px-3"
        aria-label="Entrar"
      >
        <Icon name="login" size={16} />
        <span className="customer-login-label hidden sm:inline">Entrar</span>
      </button>
      {showSheet &&
        mounted &&
        createPortal(
          <LoginRegisterSheet
            onClose={() => setShowSheet(false)}
            onSuccess={() => setShowSheet(false)}
          />,
          document.body,
        )}
    </>
  )
}
