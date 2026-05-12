'use client'
import { Icon } from '@tindivo/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCustomerAuth } from '../hooks/use-customer-auth'
import { LoginRegisterSheet } from './login-register-sheet'

/**
 * Botón en el topbar para que el cliente inicie sesión o vea su cuenta.
 * Sin sesión: muestra "Iniciar sesión" → abre LoginRegisterSheet.
 * Con sesión: muestra ícono de persona → link a /cuenta.
 */
export function LoginButton() {
  const { session, loading } = useCustomerAuth()
  const [showSheet, setShowSheet] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (loading) {
    return <div className="w-10 h-10" aria-hidden="true" />
  }

  if (session) {
    return (
      <Link
        href={session.role === 'business' ? '/negocio' : '/cuenta'}
        className="customer-lift relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-[0_10px_28px_-20px_rgba(171,53,0,0.8)] backdrop-blur"
        aria-label="Mi cuenta"
      >
        <Icon name="person" size={20} filled />
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
