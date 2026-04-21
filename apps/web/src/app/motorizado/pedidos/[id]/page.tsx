'use client'
import { useParams } from 'next/navigation'
import { ActiveOrderDetail } from '@/features/motorizado/active-order/components/active-order-detail'

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  return <ActiveOrderDetail orderId={params.id} />
}
