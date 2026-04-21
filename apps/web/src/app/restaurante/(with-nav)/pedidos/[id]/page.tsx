'use client'
import { useParams } from 'next/navigation'
import { RestaurantOrderDetail } from '@/features/restaurante/order-detail/components/restaurant-order-detail'

export default function RestaurantOrderDetailPage() {
  const params = useParams<{ id: string }>()
  return <RestaurantOrderDetail orderId={params.id} />
}
