import { AdminShell } from '@/features/admin/dashboard/components/admin-shell'
import type { ReactNode } from 'react'

/**
 * Guard: el middleware ya validó que solo rol=admin llega aquí.
 * AdminShell maneja sidebar (desktop) + GlassTopBar/drawer (móvil) + logout.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
