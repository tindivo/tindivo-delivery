/**
 * Política del horario operativo de la plataforma.
 *
 * El admin configura una ventana diaria (startHHMM..endHHMM) y los días
 * operativos. Esta policy responde, dado un instante, si la plataforma
 * está abierta o cerrada y cuándo abre la próxima ventana.
 *
 * Convenciones:
 *  - Hora se evalúa en zona horaria de Lima (Perú, UTC-5).
 *  - Días en código corto inglés (mon..sun) — alineado con
 *    `drivers.operating_days`.
 *  - Si endHHMM <= startHHMM, la ventana cruza la medianoche (ej. 18:00–02:00).
 */

export type WeekdayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type PlatformSchedule = {
  startHHMM: string
  endHHMM: string
  days: WeekdayCode[]
}

export type PlatformScheduleStatus = {
  isOpen: boolean
  reason: 'inside_window' | 'outside_window' | 'day_off'
  /** Próxima apertura (zona horaria Lima); null si la config no define ningún día activo. */
  nextOpenAt: Date | null
  /** Eco de la config evaluada — útil para mensajes en UI. */
  schedule: PlatformSchedule
}

export const PlatformSchedulePolicy = {
  evaluate(schedule: PlatformSchedule, now: Date): PlatformScheduleStatus {
    const { weekday, hhmm } = limaParts(now)
    const todayInDays = schedule.days.includes(weekday)
    const inWindow = isWithinHHMMWindow(schedule.startHHMM, schedule.endHHMM, hhmm)

    if (todayInDays && inWindow) {
      return {
        isOpen: true,
        reason: 'inside_window',
        nextOpenAt: null,
        schedule,
      }
    }

    return {
      isOpen: false,
      reason: todayInDays ? 'outside_window' : 'day_off',
      nextOpenAt: computeNextOpenAt(schedule, now),
      schedule,
    }
  },
} as const

function isWithinHHMMWindow(startHHMM: string, endHHMM: string, currentHHMM: string): boolean {
  if (startHHMM === endHHMM) return false
  if (startHHMM < endHHMM) {
    return currentHHMM >= startHHMM && currentHHMM < endHHMM
  }
  return currentHHMM >= startHHMM || currentHHMM < endHHMM
}

function limaParts(date: Date): { weekday: WeekdayCode; hhmm: string; ymd: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const weekday = get('weekday').toLowerCase() as WeekdayCode
  const hour = get('hour').padStart(2, '0').replace('24', '00')
  const minute = get('minute').padStart(2, '0')
  const year = get('year')
  const month = get('month')
  const day = get('day')
  return { weekday, hhmm: `${hour}:${minute}`, ymd: `${year}-${month}-${day}` }
}

function computeNextOpenAt(schedule: PlatformSchedule, now: Date): Date | null {
  if (schedule.days.length === 0) return null
  const { weekday, hhmm, ymd } = limaParts(now)

  const todayActive = schedule.days.includes(weekday)
  if (todayActive && hhmm < schedule.startHHMM) {
    return parseLimaDate(ymd, schedule.startHHMM)
  }

  for (let offset = 1; offset <= 7; offset++) {
    const candidate = addDaysLima(ymd, offset)
    if (schedule.days.includes(candidate.weekday)) {
      return parseLimaDate(candidate.ymd, schedule.startHHMM)
    }
  }
  return null
}

function addDaysLima(ymd: string, days: number): { ymd: string; weekday: WeekdayCode } {
  const [yStr, mStr, dStr] = ymd.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)
  // Date UTC-5 a las 12:00 evita líos por DST (Perú no usa DST, pero es defensivo).
  const base = new Date(Date.UTC(y, m - 1, d, 17, 0, 0))
  base.setUTCDate(base.getUTCDate() + days)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(base)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const weekday = get('weekday').toLowerCase() as WeekdayCode
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, weekday }
}

function parseLimaDate(ymd: string, hhmm: string): Date {
  return new Date(`${ymd}T${hhmm}:00-05:00`)
}

export const ALL_WEEKDAYS: readonly WeekdayCode[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const

/** Default fail-open: plataforma siempre abierta (compatible con comportamiento previo). */
export const DEFAULT_PLATFORM_SCHEDULE: PlatformSchedule = {
  startHHMM: '00:00',
  endHHMM: '23:59',
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
}
