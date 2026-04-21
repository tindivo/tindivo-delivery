import { OrderDetail } from '@/features/admin/order-detail/components/order-detail'

type Props = { params: Promise<{ id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  return <OrderDetail orderId={id} />
}
