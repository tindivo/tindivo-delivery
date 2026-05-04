import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type { AssignmentRulesRepository } from '../application/ports/assignment-rules.repository'
import type { AssignmentRules } from '../domain/policies/assignment-rules'

const SETTINGS_KEY = 'assignment_rules'

export class SupabaseAssignmentRulesRepository implements AssignmentRulesRepository {
  constructor(private readonly sb: ServerClient) {}

  async read(): Promise<AssignmentRules | null> {
    const { data, error } = await this.sb
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) throw new PersistenceError(error.message, error)
    if (!data?.value) return null
    return parseRules(data.value)
  }

  async write(rules: AssignmentRules, updatedBy: string): Promise<{ updatedAt: string }> {
    const value = JSON.stringify({
      maxOrdersPerDriver: rules.maxOrdersPerDriver,
      maxRestaurantsPerDriver: rules.maxRestaurantsPerDriver,
      groupingWindowMinutes: rules.groupingWindowMinutes,
    })

    const { data, error } = await this.sb
      .from('app_settings')
      .upsert({ key: SETTINGS_KEY, value, updated_by: updatedBy }, { onConflict: 'key' })
      .select('updated_at')
      .single()

    if (error) throw new PersistenceError(error.message, error)
    return { updatedAt: data?.updated_at ?? new Date().toISOString() }
  }
}

function parseRules(raw: string): AssignmentRules | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    const max = obj.maxOrdersPerDriver
    const restos = obj.maxRestaurantsPerDriver
    const win = obj.groupingWindowMinutes
    if (!isPositiveInt(max) || !isPositiveInt(restos) || !isPositiveInt(win)) return null
    return {
      maxOrdersPerDriver: max,
      maxRestaurantsPerDriver: restos,
      groupingWindowMinutes: win,
    }
  } catch {
    return null
  }
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1
}
