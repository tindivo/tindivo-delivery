'use client'
import { RestaurantOrderDetail } from '@/features/restaurante/order-detail/components/restaurant-order-detail'
import { useParams } from 'next/navigation'

export default function RestaurantOrderDetailPage() {
  const params = useParams<{ id: string }>()
  return <RestaurantOrderDetail orderId={params.id} />
}
