import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type {
  DistanceCommissions,
  DistanceCommissionsRepository,
} from '../application/ports/distance-commissions.repository'
import { Money } from '../domain/value-objects/money'

const SETTINGS_KEY = 'delivery_distance_commissions'

export class SupabaseDistanceCommissionsRepository implements DistanceCommissionsRepository {
  constructor(private readonly sb: ServerClient) {}

  async read(): Promise<DistanceCommissions | null> {
    const { data, error } = await this.sb
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) throw new PersistenceError(error.message, error)
    if (!data?.value) return null
    return parseCommissions(data.value)
  }
}

function parseCommissions(raw: string): DistanceCommissions | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    const near = obj.near
    const far = obj.far
    if (!isNonNegativeNumber(near) || !isNonNegativeNumber(far)) return null
    return { near: Money.pen(near), far: Money.pen(far) }
  } catch {
    return null
  }
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}
