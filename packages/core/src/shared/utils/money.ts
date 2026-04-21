/**
 * Helpers para manejar dinero en soles (PEN) con 2 decimales exactos.
 * Nunca operar con floats — siempre enteros en céntimos internamente
 * cuando se comparan o suman.
 */

const MINOR_UNIT_SCALE = 100

export function toMinorUnits(pen: number): number {
  return Math.round(pen * MINOR_UNIT_SCALE)
}

export function fromMinorUnits(cents: number): number {
  return Math.round(cents) / MINOR_UNIT_SCALE
}

export function addPen(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) + toMinorUnits(b))
}

export function subPen(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b))
}

export function formatPen(pen: number): string {
  const formatter = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(pen)
}
