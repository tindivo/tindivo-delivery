'use client'
import { RestaurantForm } from '@/features/admin/restaurants/components/restaurant-form'
import { useAdminRestaurant } from '@/features/admin/restaurants/hooks/use-admin-restaurants'
import { Icon, Skeleton } from '@tindivo/ui'
import { use } from 'react'

type Props = { params: Promise<{ id: string }> }

export default function AdminEditRestaurantPage({ params }: Props) {
  const { id } = use(params)
  const { data, isLoading } = useAdminRestaurant(id)

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
        <h1 className="bleed-text font-black text-3xl text-on-surface flex items-center gap-3">
          <span
            className="inline-block w-4 h-4 rounded-md border border-black/10"
            style={{ background: `#${data.accent_color}` }}
            aria-hidden="true"
          />
          {data.name}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
          <Icon name="edit" size={14} />
          Editando datos del restaurante.
        </p>
      </header>
      <RestaurantForm mode="edit" initial={data} />
    </div>
  )
}
