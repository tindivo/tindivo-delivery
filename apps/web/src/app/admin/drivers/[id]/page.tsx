'use client'
import { DriverForm } from '@/features/admin/drivers/components/driver-form'
import { useAdminDriver } from '@/features/admin/drivers/hooks/use-admin-drivers'
import { Icon, Skeleton } from '@tindivo/ui'
import { use } from 'react'

type Props = { params: Promise<{ id: string }> }

export default function AdminEditDriverPage({ params }: Props) {
  const { id } = use(params)
  const { data, isLoading } = useAdminDriver(id)

  if (isLoading || !data) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-10" />
        <Skeleton className="h-60" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="bleed-text font-black text-3xl text-on-surface">{data.full_name}</h1>
        <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
          <Icon name="edit" size={14} />
          Editando datos del motorizado.
        </p>
      </header>
      <DriverForm mode="edit" initial={data} />
    </div>
  )
}
