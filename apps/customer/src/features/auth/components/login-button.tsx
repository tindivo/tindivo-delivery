'use client'
import { Icon } from '@tindivo/ui'
import Link from 'next/link'
import { useState } from 'react'
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

  if (loading) {
    return <div className="w-10 h-10" aria-hidden="true" />
  }

  if (session) {
    return (
      <Link
        href="/cuenta"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest border border-outline-variant/30"
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
        className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full bg-surface-container-lowest border border-outline-variant/30 text-sm font-bold text-on-surface"
      >
        <Icon name="login" size={16} />
        Entrar
      </button>
      {showSheet && (
        <LoginRegisterSheet
          onClose={() => setShowSheet(false)}
          onSuccess={() => setShowSheet(false)}
        />
      )}
    </>
  )
}
