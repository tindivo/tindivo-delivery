'use client'
import { useParams } from 'next/navigation'
import { OrderPreview } from '@/features/motorizado/order-preview/components/order-preview'

export default function OrderPreviewPage() {
  const params = useParams<{ id: string }>()
  return <OrderPreview orderId={params.id} />
}
