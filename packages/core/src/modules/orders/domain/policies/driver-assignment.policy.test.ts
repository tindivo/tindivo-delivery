import { describe, expect, it } from 'vitest'
import { type DriverAssignmentCandidate, DriverAssignmentPolicy } from './driver-assignment.policy'

function candidate(over: Partial<DriverAssignmentCandidate>): DriverAssignmentCandidate {
  return {
    driverId: 'driver-x',
    deliveredToday: 0,
    activeCount: 0,
    reservedCount: 0,
    sameRestaurantWindowCount: 0,
    operatingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    shiftStart: '08:00',
    shiftEnd: '23:00',
    ...over,
  }
}

describe('DriverAssignmentPolicy.choose — prioridad absoluta a idle', () => {
  it('elige el idle aunque tenga más entregas que un no-idle', () => {
    const idleConCarga = candidate({
      driverId: 'driver-idle-busy',
      deliveredToday: 8,
      activeCount: 0,
      reservedCount: 0,
    })
    const noIdleSinEntregas = candidate({
      driverId: 'driver-noidle-fresh',
      deliveredToday: 0,
      activeCount: 1,
      reservedCount: 0,
    })

    const decision = DriverAssignmentPolicy.choose([idleConCarga, noIdleSinEntregas])

    expect(decision).toEqual({
      driverId: 'driver-idle-busy',
      reason: 'idle_driver_priority',
    })
  })

  it('entre múltiples idle, elige el de menor deliveredToday', () => {
    const idleA = candidate({ driverId: 'driver-a', deliveredToday: 5 })
    const idleB = candidate({ driverId: 'driver-b', deliveredToday: 2 })
    const idleC = candidate({ driverId: 'driver-c', deliveredToday: 8 })

    const decision = DriverAssignmentPolicy.choose([idleA, idleB, idleC])

    expect(decision?.driverId).toBe('driver-b')
    expect(decision?.reason).toBe('idle_driver_priority')
  })

  it('entre idle empatados en deliveredToday, desempata por driverId asc (determinismo)', () => {
    const idleZ = candidate({ driverId: 'driver-z', deliveredToday: 3 })
    const idleA = candidate({ driverId: 'driver-a', deliveredToday: 3 })

    const decision = DriverAssignmentPolicy.choose([idleZ, idleA])

    expect(decision?.driverId).toBe('driver-a')
  })

  it('un driver con 1 reservado NO es idle (cuenta como ocupado)', () => {
    const reservado = candidate({
      driverId: 'driver-reservado',
      deliveredToday: 0,
      activeCount: 0,
      reservedCount: 1,
    })
    const idle = candidate({
      driverId: 'driver-libre',
      deliveredToday: 5,
      activeCount: 0,
      reservedCount: 0,
    })

    const decision = DriverAssignmentPolicy.choose([reservado, idle])

    expect(decision?.driverId).toBe('driver-libre')
    expect(decision?.reason).toBe('idle_driver_priority')
  })

  it('idle gana incluso si el otro tiene sameRestaurantWindowCount (bonus de agrupación)', () => {
    const idle = candidate({ driverId: 'driver-idle', deliveredToday: 10 })
    const conBonus = candidate({
      driverId: 'driver-bonus',
      deliveredToday: 0,
      activeCount: 1,
      sameRestaurantWindowCount: 2,
    })

    const decision = DriverAssignmentPolicy.choose([idle, conBonus])

    expect(decision?.driverId).toBe('driver-idle')
    expect(decision?.reason).toBe('idle_driver_priority')
  })
})

describe('DriverAssignmentPolicy.choose — fallback al score balanceado cuando no hay idle', () => {
  it('elige al de menor workload total', () => {
    const cargado = candidate({
      driverId: 'driver-cargado',
      deliveredToday: 5,
      activeCount: 2,
      reservedCount: 1,
    })
    const liviano = candidate({
      driverId: 'driver-liviano',
      deliveredToday: 1,
      activeCount: 1,
      reservedCount: 0,
    })

    const decision = DriverAssignmentPolicy.choose([cargado, liviano])

    expect(decision?.driverId).toBe('driver-liviano')
    expect(decision?.reason).toBe('balanced_daily_workload')
  })

  it('aplica bonus same_restaurant_window cuando ambos tienen carga similar', () => {
    const sinBonus = candidate({
      driverId: 'driver-sin-bonus',
      deliveredToday: 1,
      activeCount: 1,
      sameRestaurantWindowCount: 0,
    })
    const conBonus = candidate({
      driverId: 'driver-con-bonus',
      deliveredToday: 1,
      activeCount: 1,
      sameRestaurantWindowCount: 1,
    })

    const decision = DriverAssignmentPolicy.choose([sinBonus, conBonus])

    expect(decision?.driverId).toBe('driver-con-bonus')
    expect(decision?.reason).toBe('same_restaurant_window')
  })
})

describe('DriverAssignmentPolicy.choose — casos borde', () => {
  it('retorna null si no hay candidatos', () => {
    expect(DriverAssignmentPolicy.choose([])).toBeNull()
  })

  it('un solo candidato idle es elegido', () => {
    const solo = candidate({ driverId: 'driver-only', deliveredToday: 100 })
    const decision = DriverAssignmentPolicy.choose([solo])
    expect(decision?.driverId).toBe('driver-only')
    expect(decision?.reason).toBe('idle_driver_priority')
  })
})
