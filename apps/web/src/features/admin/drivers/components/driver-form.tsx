'use client'
import { ApiError } from '@tindivo/api-client'
import type { Drivers } from '@tindivo/contracts'
import { Button, Icon, Input, Label, PhoneInputPe } from '@tindivo/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCreateDriver, useUpdateDriver } from '../hooks/use-admin-drivers'

type VehicleType = 'moto' | 'bicicleta' | 'pie' | 'auto'
type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

const VEHICLES: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'moto', label: 'Moto', icon: 'two_wheeler' },
  { value: 'bicicleta', label: 'Bicicleta', icon: 'pedal_bike' },
  { value: 'pie', label: 'A pie', icon: 'directions_walk' },
  { value: 'auto', label: 'Auto', icon: 'directions_car' },
]

const DAYS: { code: DayCode; short: string; long: string }[] = [
  { code: 'mon', short: 'L', long: 'Lunes' },
  { code: 'tue', short: 'M', long: 'Martes' },
  { code: 'wed', short: 'X', long: 'Miércoles' },
  { code: 'thu', short: 'J', long: 'Jueves' },
  { code: 'fri', short: 'V', long: 'Viernes' },
  { code: 'sat', short: 'S', long: 'Sábado' },
  { code: 'sun', short: 'D', long: 'Domingo' },
]

type Props = {
  mode: 'create' | 'edit'
  initial?: {
    id: string
    full_name: string
    phone: string
    vehicle_type: VehicleType
    license_plate: string | null
    operating_days: string[]
    shift_start: string
    shift_end: string
  }
}

export function DriverForm({ mode, initial }: Props) {
  const router = useRouter()
  const create = useCreateDriver()
  const update = useUpdateDriver(initial?.id ?? '')

  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicle_type ?? 'moto')
  const [licensePlate, setLicensePlate] = useState(initial?.license_plate ?? '')
  const [operatingDays, setOperatingDays] = useState<DayCode[]>(
    (initial?.operating_days as DayCode[] | undefined) ?? [
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ],
  )
  const [shiftStart, setShiftStart] = useState(initial?.shift_start?.slice(0, 5) ?? '18:00')
  const [shiftEnd, setShiftEnd] = useState(initial?.shift_end?.slice(0, 5) ?? '23:00')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const pending = create.isPending || update.isPending

  function toggleDay(code: DayCode) {
    setOperatingDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    )
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorMsg(null)

    if (operatingDays.length === 0) {
      setErrorMsg('Selecciona al menos un día laboral.')
      return
    }

    if (mode === 'create') {
      const body: Drivers.CreateDriverRequest = {
        fullName,
        phone,
        vehicleType,
        licensePlate: licensePlate || undefined,
        operatingDays,
        shiftStart,
        shiftEnd,
        userEmail,
        userPassword,
      }
      try {
        await create.mutateAsync(body)
        router.push('/admin/drivers')
      } catch (err) {
        setErrorMsg(humanizeError(err))
      }
    } else {
      const body: Drivers.UpdateDriverRequest = {
        fullName,
        phone,
        vehicleType,
        licensePlate: licensePlate || undefined,
        operatingDays,
        shiftStart,
        shiftEnd,
      }
      try {
        await update.mutateAsync(body)
        router.push('/admin/drivers')
      } catch (err) {
        setErrorMsg(humanizeError(err))
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Datos del motorizado
        </h2>

        <div>
          <Label htmlFor="fullName">Nombre completo</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={3}
            maxLength={80}
            placeholder="Juan Pérez Gómez"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <PhoneInputPe
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              required
            />
          </div>
          <div>
            <Label htmlFor="licensePlate">Placa (opcional)</Label>
            <Input
              id="licensePlate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase().slice(0, 20))}
              maxLength={20}
              className="font-mono uppercase"
              placeholder="ABC-123"
            />
          </div>
        </div>

        <div>
          <Label>Vehículo</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {VEHICLES.map((v) => {
              const active = vehicleType === v.value
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVehicleType(v.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={v.icon} size={24} />
                  <span className="text-xs">{v.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
        <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
          Horarios y días laborales
        </h2>

        <div>
          <Label>Días que trabaja</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS.map((day) => {
              const active = operatingDays.includes(day.code)
              return (
                <button
                  key={day.code}
                  type="button"
                  onClick={() => toggleDay(day.code)}
                  title={day.long}
                  className={`w-11 h-11 rounded-full border font-bold transition-colors ${
                    active
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {day.short}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-on-surface-variant mt-2">
            Toca los días para activarlos o desactivarlos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="shiftStart">Turno inicio</Label>
            <Input
              id="shiftStart"
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="shiftEnd">Turno fin</Label>
            <Input
              id="shiftEnd"
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      {mode === 'create' && (
        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 border border-outline-variant/15">
          <h2 className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">
            Credenciales del motorizado (login a la PWA)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña temporal (mín 8)</Label>
              <Input
                id="password"
                type="text"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                required
                minLength={8}
                maxLength={80}
              />
            </div>
          </div>
          <p className="text-xs text-on-surface-variant">
            Comparte estas credenciales con el motorizado tras la creación.
          </p>
        </section>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} size="lg">
          <Icon name="check" />
          {pending ? 'Guardando...' : mode === 'create' ? 'Crear motorizado' : 'Guardar cambios'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={pending}
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function humanizeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.problem.code === 'VALIDATION_ERROR') {
      return err.problem.detail ?? 'Algún dato no es válido.'
    }
    return err.problem.detail ?? err.problem.title
  }
  return 'Algo salió mal. Intenta de nuevo.'
}
