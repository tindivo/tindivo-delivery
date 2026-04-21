import type { ReactNode } from 'react'
import { AdminSidebar } from '@/features/admin/dashboard/components/admin-sidebar'

/**
 * Guard: el middleware ya validó que solo rol=admin llega aquí.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
