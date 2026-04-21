import { createAdminClient } from '@tindivo/supabase'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TrackingView } from '@/features/tracking/components/tracking-view'

type Props = { params: Promise<{ shortId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId } = await params
  return {
    title: `Tindivo — Pedido #${shortId}`,
    description: 'Seguimiento en tiempo real de tu pedido Tindivo',
  }
}

export const dynamic = 'force-dynamic'

export default async function TrackingPage({ params }: Props) {
  const { shortId } = await params
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(shortId)) notFound()

  const sb = createAdminClient()
  const { data } = await sb.rpc('get_tracking', { p_short_id: shortId })

  if (!data) notFound()

  return <TrackingView initial={data as never} shortId={shortId} />
}
