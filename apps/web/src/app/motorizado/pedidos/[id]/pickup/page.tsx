'use client'
import { PickupForm } from '@/features/motorizado/pickup/components/pickup-form'
import { useParams } from 'next/navigation'

export default function PickupPage() {
  const params = useParams<{ id: string }>()
  return <PickupForm orderId={params.id} />
}
