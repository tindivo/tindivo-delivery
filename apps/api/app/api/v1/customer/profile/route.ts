import {
  buildGetMyProfileUseCase,
  buildUpdateMyProfileUseCase,
} from '@/lib/core/container'
import { problem, problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateProfileSchema = z
  .object({
    fullName: z.string().min(2).max(80).optional(),
    phone: z
      .string()
      .regex(/^9\d{8}$/, 'Celular debe tener 9 dígitos y empezar con 9')
      .nullable()
      .optional(),
    defaultAddress: z.string().min(5).max(500).nullable().optional(),
    defaultReference: z.string().max(500).nullable().optional(),
    defaultCoordinates: z
      .object({ lat: z.number(), lng: z.number() })
      .nullable()
      .optional(),
    defaultLocationAccuracyM: z.number().min(0).max(10000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Al menos un campo a actualizar',
  })

function serialize(profile: {
  userId: string
  fullName: string
  phone: string | null
  defaultAddress: string | null
  defaultReference: string | null
  defaultCoordinates: { lat: number; lng: number } | null
  defaultLocationAccuracyM: number | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    userId: profile.userId,
    fullName: profile.fullName,
    phone: profile.phone,
    defaultAddress: profile.defaultAddress,
    defaultReference: profile.defaultReference,
    defaultCoordinates: profile.defaultCoordinates,
    defaultLocationAccuracyM: profile.defaultLocationAccuracyM,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['customer'])
  if (!auth.ok) return auth.response

  const useCase = buildGetMyProfileUseCase(auth.auth.supabase)
  const result = await useCase.execute({ userId: auth.auth.userId })
  if (result.isFailure) return problem(result.error)

  if (!result.value) return problemCode('NOT_FOUND', 404, 'Perfil no encontrado')
  return NextResponse.json({ profile: serialize(result.value) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['customer'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, UpdateProfileSchema)
  if (!body.ok) return body.response

  const useCase = buildUpdateMyProfileUseCase(auth.auth.supabase)
  const result = await useCase.execute({ userId: auth.auth.userId, update: body.data })
  if (result.isFailure) return problem(result.error)

  return NextResponse.json({ profile: serialize(result.value) })
}
