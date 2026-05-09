import { describe, expect, it } from 'vitest'
import { type AssignmentRules, DEFAULT_ASSIGNMENT_RULES } from './assignment-rules'
import { type DriverAssignmentCandidate, DriverAssignmentPolicy } from './driver-assignment.policy'

// Ahora `choose` requiere occupancySlots del pedido entrante. Default 1
// preserva semántica de los tests anteriores (compat con R3 hardcoded en +1).
const RESTAURANT = { restaurantId: 'rest-1', occupancySlots: 1 }
const RULES: AssignmentRules = DEFAULT_ASSIGNMENT_RULES // 3 / 2 / 5

function candidate(over: Partial<DriverAssignmentCandidate>): DriverAssignmentCandidate {
  const activeCount = over.activeCount ?? 0
  const reservedCount = over.reservedCount ?? 0
  // Por default los tests asumen slots=1 por pedido (compat con R3 anterior
  // basado en counts). Tests específicos de slots > 1 pueden override.
  return {
    driverId: 'driver-x',
    deliveredToday: 0,
    activeCount,
    reservedCount,
    activeSlots: over.activeSlots ?? activeCount,
    reservedSlots: over.reservedSlots ?? reservedCount,
    cancelledTodayCount: 0,
    rejectedTodayCount: 0,
    sameRestaurantWindowCount: 0,
    distinctRestaurantsInBag: [],
    shiftStartedAt: null,
    operatingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    shiftStart: '08:00',
    shiftEnd: '23:00',
    ...over,
  }
}

describe('DriverAssignmentPolicy.choose — R3 (cap mochila)', () => {
  it('B3: descarta drivers que ya tienen maxOrdersPerDriver pedidos en mochila', () => {
    const lleno = candidate({ driverId: 'a', activeCount: 2, reservedCount: 1 }) // 3 = cap
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [lleno], RULES)
    expect(decision).toBeNull()
  })

  it('respeta cap configurado dinámicamente (rules.maxOrdersPerDriver=2)', () => {
    const dosOrders = candidate({ driverId: 'a', activeCount: 2 })
    const reglasCap2: AssignmentRules = { ...RULES, maxOrdersPerDriver: 2 }
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [dosOrders], reglasCap2)
    expect(decision).toBeNull()
  })

  it('R3 cuenta activos + reservados (no solo activos)', () => {
    const mixed = candidate({ driverId: 'a', activeCount: 1, reservedCount: 2 }) // 3 = cap
    const libre = candidate({ driverId: 'b' })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [mixed, libre], RULES)
    expect(decision?.driverId).toBe('b')
  })

  it('R3 respeta occupancySlots>1 del pedido entrante (no asume +1)', () => {
    // Driver lleva 1 slot. Pedido entrante ocupa 3 slots. Cap=3 → 1+0+3=4 > 3
    // → driver fuera del pool. Antes (con +1 hardcoded) habría entrado.
    const a = candidate({ driverId: 'a', activeCount: 1, activeSlots: 1 })
    const decision = DriverAssignmentPolicy.choose(
      { restaurantId: 'rest-1', occupancySlots: 3 },
      [a],
      RULES,
    )
    expect(decision).toBeNull()
  })

  it('R3 con occupancySlots=2 sí entra si hay espacio (1+0+2=3 ≤ cap=3)', () => {
    const a = candidate({ driverId: 'a', activeCount: 1, activeSlots: 1 })
    const decision = DriverAssignmentPolicy.choose(
      { restaurantId: 'rest-1', occupancySlots: 2 },
      [a],
      RULES,
    )
    expect(decision?.driverId).toBe('a')
  })
})

describe('DriverAssignmentPolicy.choose — R1 (agrupación) + R4', () => {
  it('B1: pedido va al driver que ya tiene uno del mismo restaurante en ventana', () => {
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 1,
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1'],
    })
    const b = candidate({ driverId: 'driver-b' })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a, b], RULES)
    expect(decision).toEqual({ driverId: 'driver-a', reason: 'R1_grouping' })
  })

  it('R1 con múltiples matches elige el least loaded (R4 desempata)', () => {
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 2,
      deliveredToday: 3,
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1'],
    })
    const b = candidate({
      driverId: 'driver-b',
      activeCount: 1,
      deliveredToday: 1,
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1'],
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a, b], RULES)
    expect(decision).toEqual({ driverId: 'driver-b', reason: 'R1_grouping' })
  })

  it('B8: R1 sobrepasa R2 cuando el driver ya tiene ese restaurante en mochila', () => {
    // Driver-a tiene 2 restaurantes (rest-1, rest-2) — está en cap R2.
    // Pero el pedido nuevo es de rest-1 (que ya tiene), entonces R1 puede asignar.
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 2,
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1', 'rest-2'],
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a], RULES)
    expect(decision).toEqual({ driverId: 'driver-a', reason: 'R1_grouping' })
  })

  it('R1 NO sobrepasa R3: si el driver con match está en cap de mochila, queda fuera', () => {
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 3, // ya en cap R3
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1'],
    })
    const b = candidate({ driverId: 'driver-b' })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a, b], RULES)
    // a queda filtrado en R3, b gana por R4
    expect(decision).toEqual({ driverId: 'driver-b', reason: 'R4_rotation' })
  })
})

describe('DriverAssignmentPolicy.choose — R2 (cap restaurantes)', () => {
  it('B2: descarta driver que ya tiene maxRestaurantsPerDriver distintos si el pedido es de un nuevo', () => {
    // Driver-a tiene rest-2 y rest-3 (2 distintos = cap R2).
    // El pedido nuevo es de rest-1 (no lo tiene), entonces R2 lo descarta.
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 2,
      distinctRestaurantsInBag: ['rest-2', 'rest-3'],
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a], RULES)
    expect(decision).toBeNull() // R5: cola "restaurant_cap_exceeded"
  })

  it('R2 cap es configurable dinámicamente', () => {
    const reglasCap1: AssignmentRules = { ...RULES, maxRestaurantsPerDriver: 1 }
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 1,
      distinctRestaurantsInBag: ['rest-2'], // 1 = cap
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a], reglasCap1)
    expect(decision).toBeNull()
  })

  it('R2 no se aplica si el driver ya tiene el restaurante del pedido', () => {
    const a = candidate({
      driverId: 'driver-a',
      activeCount: 1,
      distinctRestaurantsInBag: ['rest-1'], // ya lo tiene
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [a], RULES)
    expect(decision).toEqual({ driverId: 'driver-a', reason: 'R4_rotation' })
  })
})

describe('DriverAssignmentPolicy.choose — R4 (rotación) y tiebreaks', () => {
  it('B4: elige el driver con menor totalAssignedDay', () => {
    const cargado = candidate({
      driverId: 'cargado',
      deliveredToday: 5,
      activeCount: 1,
      reservedCount: 1,
      cancelledTodayCount: 1,
    }) // total = 8
    const liviano = candidate({
      driverId: 'liviano',
      deliveredToday: 2,
      activeCount: 1,
    }) // total = 3
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [cargado, liviano], RULES)
    expect(decision).toEqual({ driverId: 'liviano', reason: 'R4_rotation' })
  })

  it('totalAssignedDay incluye cancelados del día (penaliza al que cancela seguido)', () => {
    const conCancelados = candidate({
      driverId: 'conc',
      deliveredToday: 2,
      cancelledTodayCount: 3,
    }) // total = 5
    const sinCancelados = candidate({
      driverId: 'sinc',
      deliveredToday: 4,
    }) // total = 4
    const decision = DriverAssignmentPolicy.choose(
      RESTAURANT,
      [conCancelados, sinCancelados],
      RULES,
    )
    expect(decision?.driverId).toBe('sinc')
  })

  it('totalAssignedDay incluye rechazos del día (driver que rechaza mucho cae al fondo)', () => {
    // Caso real verificado en BD: driver Jesús (2b96d299) rechazó 7 pedidos
    // pero seguía siendo "least loaded". Ahora rechazos suman como carga.
    const rechazon = candidate({
      driverId: 'rechazon',
      deliveredToday: 1,
      rejectedTodayCount: 5,
    }) // total = 6
    const sinRechazos = candidate({
      driverId: 'limpio',
      deliveredToday: 3,
    }) // total = 3
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [rechazon, sinRechazos], RULES)
    expect(decision?.driverId).toBe('limpio')
  })

  it('tiebreak por shiftStartedAt: gana el que entró antes al turno', () => {
    const tarde = candidate({
      driverId: 'tarde',
      shiftStartedAt: new Date('2026-05-04T20:00:00Z'),
    })
    const temprano = candidate({
      driverId: 'temprano',
      shiftStartedAt: new Date('2026-05-04T18:00:00Z'),
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [tarde, temprano], RULES)
    expect(decision?.driverId).toBe('temprano')
  })

  it('shiftStartedAt null va al final (ordena ASC NULLS LAST)', () => {
    const sinShift = candidate({ driverId: 'no-shift', shiftStartedAt: null })
    const conShift = candidate({
      driverId: 'con-shift',
      shiftStartedAt: new Date('2026-05-04T22:00:00Z'),
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [sinShift, conShift], RULES)
    expect(decision?.driverId).toBe('con-shift')
  })

  it('tiebreak final por driverId asc cuando workload y shiftStartedAt empatan', () => {
    const same = new Date('2026-05-04T18:00:00Z')
    const z = candidate({ driverId: 'z', shiftStartedAt: same })
    const a = candidate({ driverId: 'a', shiftStartedAt: same })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [z, a], RULES)
    expect(decision?.driverId).toBe('a')
  })
})

describe('DriverAssignmentPolicy.choose — casos borde', () => {
  it('retorna null si no hay candidatos', () => {
    expect(DriverAssignmentPolicy.choose(RESTAURANT, [], RULES)).toBeNull()
  })

  it('un solo candidato libre es elegido por R4', () => {
    const solo = candidate({ driverId: 'only' })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [solo], RULES)
    expect(decision).toEqual({ driverId: 'only', reason: 'R4_rotation' })
  })

  it('NO aplica idle priority del algoritmo previo (era extra de Tindivo, no del simulador)', () => {
    // En el algoritmo previo, un driver con 0 carga ganaba siempre. Ahora
    // si otro tiene match de R1, R1 prevalece sobre el idle.
    const idle = candidate({ driverId: 'idle' })
    const conMatch = candidate({
      driverId: 'match',
      activeCount: 1,
      sameRestaurantWindowCount: 1,
      distinctRestaurantsInBag: ['rest-1'],
    })
    const decision = DriverAssignmentPolicy.choose(RESTAURANT, [idle, conMatch], RULES)
    expect(decision).toEqual({ driverId: 'match', reason: 'R1_grouping' })
  })
})
