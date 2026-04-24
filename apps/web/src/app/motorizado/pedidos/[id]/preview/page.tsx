'use client'
import { OrderPreview } from '@/features/motorizado/order-preview/components/order-preview'
import { useParams } from 'next/navigation'

export default function OrderPreviewPage() {
  const params = useParams<{ id: string }>()
  return <OrderPreview orderId={params.id} />
}
