import type { ServerClient } from '@tindivo/supabase'
import { PersistenceError } from '../../../shared/errors/domain-error'
import type { PlatformSettingsRepository } from '../application/ports/platform-settings.repository'
import {
  ALL_WEEKDAYS,
  type PlatformSchedule,
  type WeekdayCode,
} from '../domain/policies/platform-schedule.policy'

const SETTINGS_KEY = 'platform_schedule'
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class SupabasePlatformSettingsRepository implements PlatformSettingsRepository {
  constructor(private readonly sb: ServerClient) {}

  async read(): Promise<PlatformSchedule | null> {
    const { data, error } = await this.sb
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) throw new PersistenceError(error.message, error)
    if (!data?.value) return null

    return parseSchedule(data.value)
  }

  async write(schedule: PlatformSchedule, updatedBy: string): Promise<{ updatedAt: string }> {
    const value = JSON.stringify({
      startHHMM: schedule.startHHMM,
      endHHMM: schedule.endHHMM,
      days: schedule.days,
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

function parseSchedule(raw: string): PlatformSchedule | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const obj = parsed as Record<string, unknown>
    const startHHMM = obj.startHHMM
    const endHHMM = obj.endHHMM
    const days = obj.days
    if (typeof startHHMM !== 'string' || !HHMM.test(startHHMM)) return null
    if (typeof endHHMM !== 'string' || !HHMM.test(endHHMM)) return null
    if (!Array.isArray(days)) return null
    const valid: WeekdayCode[] = []
    for (const d of days) {
      if (typeof d === 'string' && (ALL_WEEKDAYS as string[]).includes(d)) {
        valid.push(d as WeekdayCode)
      }
    }
    if (valid.length === 0) return null
    return { startHHMM, endHHMM, days: valid }
  } catch {
    return null
  }
}
