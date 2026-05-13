import type { NextRequest } from 'next/server'

const LIMA_OFFSET_HOURS = 5
const DAY_MS = 24 * 60 * 60 * 1000

export type MetricsRange = { from: Date; to: Date }

export function parseMetricsRange(req: NextRequest): MetricsRange {
  const url = new URL(req.url)
  const fromQ = url.searchParams.get('from')
  const toQ = url.searchParams.get('to')

  if (fromQ && toQ) {
    const from = new Date(fromQ)
    const to = new Date(toQ)
    if (
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      to.getTime() > from.getTime()
    ) {
      return { from, to }
    }
  }

  return defaultRangeLast30Lima()
}

function defaultRangeLast30Lima(): MetricsRange {
  const now = new Date()
  const localNow = new Date(now.getTime() - LIMA_OFFSET_HOURS * 60 * 60 * 1000)
  const endLocalDay = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0),
  )
  const to = new Date(endLocalDay.getTime() + LIMA_OFFSET_HOURS * 60 * 60 * 1000 + DAY_MS)
  const from = new Date(to.getTime() - 30 * DAY_MS)
  return { from, to }
}

export function rangeEnvelope(range: MetricsRange) {
  return { from: range.from.toISOString(), to: range.to.toISOString() }
}
