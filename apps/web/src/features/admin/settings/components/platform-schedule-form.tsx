'use client'
import { ApiError, type PlatformScheduleDto, type WeekdayCode } from '@tindivo/api-client'
import { Button, Icon, Label, cn } from '@tindivo/ui'
import { useEffect, useState } from 'react'
import {
  usePlatformScheduleAdmin,
  useUpdatePlatformSchedule,
} from '../hooks/use-platform-schedule-admin'
import { formatSavedAt } from '../lib/format-saved-at'

const DAYS: { code: WeekdayCode; label: string }[] = [
  { code: 'mon', label: 'Lun' },
  { code: 'tue', label: 'Mar' },
  { code: 'wed', label: 'Mié' },
  { code: 'thu', label: 'Jue' },
  { code: 'fri', label: 'Vie' },
  { code: 'sat', label: 'Sáb' },
  { code: 'sun', label: 'Dom' },
]

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Form para configurar el horario operativo de la plataforma. Fuera de la
 * ventana, los restaurantes no pueden crear pedidos y un cron diario pone
 * a los drivers en is_available=false al cierre.
 */
export function PlatformScheduleForm() {
  const { data, isLoading } = usePlatformScheduleAdmin()
  const update = useUpdatePlatformSchedule()
  const [startHHMM, setStartHHMM] = useState('18:00')
  const [endHHMM, setEndHHMM] = useState('23:00')
  const [days, setDays] = useState<WeekdayCode[]>([])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      setStartHHMM(data.schedule.startHHMM)
      setEndHHMM(data.schedule.endHHMM)
      setDays(data.schedule.days)
      setSavedAt(data.updatedAt)
    }
  }, [data])

  function toggleDay(code: WeekdayCode) {
    setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!HHMM.test(startHHMM) || !HHMM.test(endHHMM)) {
      setErrorMsg('Las horas deben tener formato HH:MM (24h).')
      return
    }
    if (startHHMM === endHHMM) {
      setErrorMsg('La hora inicio y la hora fin no pueden ser iguales.')
      return
    }
    if (days.length === 0) {
      setErrorMsg('Selecciona al menos un día operativo.')
      return
    }
    const body: PlatformScheduleDto = { startHHMM, endHHMM, days }
    try {
      const res = await update.mutateAsync(body)
      setSavedAt(res.updatedAt)
    } catch (err) {
      setErrorMsg(humanize(err))
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
      <div>
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Horario operativo
        </h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Hora local Perú. Fuera de esta ventana los restaurantes no pueden crear pedidos y los
          motorizados pasan a "no disponible" al cierre.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start-hhmm">Hora inicio</Label>
            <input
              id="start-hhmm"
              type="time"
              value={startHHMM}
              onChange={(e) => setStartHHMM(e.target.value)}
              className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="end-hhmm">Hora fin</Label>
            <input
              id="end-hhmm"
              type="time"
              value={endHHMM}
              onChange={(e) => setEndHHMM(e.target.value)}
              className="w-full rounded-xl bg-surface-container border border-outline-variant/30 px-3 py-2 text-base font-semibold tabular-nums"
            />
          </div>
        </div>

        <div>
          <Label>Días operativos</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS.map((d) => {
              const active = days.includes(d.code)
              return (
                <button
                  type="button"
                  key={d.code}
                  onClick={() => toggleDay(d.code)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold tracking-wide uppercase border transition-colors',
                    active
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:border-outline-variant',
                  )}
                  aria-pressed={active}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending || isLoading} size="lg">
            <Icon name="check" />
            {update.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {savedAt && !update.isPending && (
            <span className="text-xs text-on-surface-variant">
              Última actualización: {formatSavedAt(savedAt)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

function humanize(err: unknown): string {
  if (err instanceof ApiError) return err.problem.detail ?? err.problem.title
  return 'No se pudo guardar el horario. Intenta de nuevo.'
}
