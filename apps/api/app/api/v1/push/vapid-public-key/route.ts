import { NextResponse } from 'next/server'
import { problemCode } from '@/lib/http/problem'

export const dynamic = 'force-dynamic'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return problemCode('INTERNAL_ERROR', 500, 'VAPID no configurado')
  return NextResponse.json({ publicKey })
}
