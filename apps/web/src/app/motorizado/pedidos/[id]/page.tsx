'use client'
import { ActiveOrderDetail } from '@/features/motorizado/active-order/components/active-order-detail'
import { useParams } from 'next/navigation'

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  return <ActiveOrderDetail orderId={params.id} />
}
