import { ErrorCodes, type ProblemDetails } from '@tindivo/contracts'
import { DomainError } from '@tindivo/core'
import { NextResponse } from 'next/server'

const CODE_TO_STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  INVALID_JWT: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  ORDER_NOT_FOUND: 404,
  RESTAURANT_NOT_FOUND: 404,
  DRIVER_NOT_FOUND: 404,
  ORDER_ALREADY_ACCEPTED: 409,
  RACE_CONDITION: 409,
  INVALID_STATE_TRANSITION: 409,
  ORDER_NOT_CANCELLABLE: 409,
  SETTLEMENT_ALREADY_PAID: 409,
  ACCENT_COLOR_TAKEN: 409,
  DRIVER_CAPACITY_EXCEEDED: 409,
  OUTSIDE_OPERATING_HOURS: 409,
  PREP_TIME_EXTENSION_LIMIT: 409,
  RESTAURANT_BLOCKED: 403,
  INTERNAL_ERROR: 500,
  TRACKING_NOT_AVAILABLE: 404,
}

const CODE_TO_TITLE: Record<string, string> = {
  UNAUTHENTICATED: 'No autenticado',
  FORBIDDEN: 'Permiso insuficiente',
  VALIDATION_ERROR: 'Datos inválidos',
  ORDER_NOT_FOUND: 'Pedido no encontrado',
  RACE_CONDITION: 'Conflicto por cambio concurrente',
  ORDER_ALREADY_ACCEPTED: 'El pedido ya fue aceptado',
  INVALID_STATE_TRANSITION: 'Transición de estado inválida',
  ORDER_NOT_CANCELLABLE: 'Pedido no cancelable',
  INTERNAL_ERROR: 'Error interno',
}

export function problem(error: unknown, requestId?: string): NextResponse {
  let code = ErrorCodes.INTERNAL_ERROR as string
  let detail: string | undefined
  let details: Record<string, unknown> | undefined

  if (error instanceof DomainError) {
    code = error.code
    detail = error.message
    details = error.details
  } else if (error instanceof Error) {
    detail = error.message
  }

  const status = CODE_TO_STATUS[code] ?? 500
  const title = CODE_TO_TITLE[code] ?? 'Error'

  const body: ProblemDetails = {
    type: `https://tindivo.pe/errors/${code.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    code: code as ProblemDetails['code'],
    detail,
    requestId,
    errors:
      details && 'errors' in details ? (details.errors as Record<string, string[]>) : undefined,
  }

  return NextResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

export function problemCode(code: string, status?: number, detail?: string): NextResponse {
  return NextResponse.json(
    {
      type: `https://tindivo.pe/errors/${code.toLowerCase().replace(/_/g, '-')}`,
      title: CODE_TO_TITLE[code] ?? 'Error',
      status: status ?? CODE_TO_STATUS[code] ?? 500,
      code,
      detail,
    },
    { status: status ?? CODE_TO_STATUS[code] ?? 500 },
  )
}
