'use client'
import { useParams } from 'next/navigation'
import { PickupForm } from '@/features/motorizado/pickup/components/pickup-form'

export default function PickupPage() {
  const params = useParams<{ id: string }>()
  return <PickupForm orderId={params.id} />
}
