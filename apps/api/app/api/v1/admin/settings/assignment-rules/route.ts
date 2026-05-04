import { problemCode } from '@/lib/http/problem'
import { requireAuth } from '@/lib/http/require-auth'
import { parseJson } from '@/lib/http/validate'
import {
  type AssignmentRules,
  DEFAULT_ASSIGNMENT_RULES,
  SupabaseAssignmentRulesRepository,
} from '@tindivo/core/modules/orders'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const UpdateSchema = z.object({
  maxOrdersPerDriver: z
    .number()
    .int('maxOrdersPerDriver debe ser entero')
    .min(1, 'maxOrdersPerDriver mínimo 1')
    .max(10, 'maxOrdersPerDriver máximo 10'),
  maxRestaurantsPerDriver: z
    .number()
    .int('maxRestaurantsPerDriver debe ser entero')
    .min(1, 'maxRestaurantsPerDriver mínimo 1')
    .max(10, 'maxRestaurantsPerDriver máximo 10'),
  groupingWindowMinutes: z
    .number()
    .int('groupingWindowMinutes debe ser entero')
    .min(1, 'groupingWindowMinutes mínimo 1 minuto')
    .max(60, 'groupingWindowMinutes máximo 60 minutos'),
})

/**
 * GET /api/v1/admin/settings/assignment-rules
 * Devuelve las reglas de asignación. Si nunca se configuraron, responde
 * el default del simulador (3/2/5) sin crear filas.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const { data, error } = await auth.auth.supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', 'assignment_rules')
    .maybeSingle()

  if (error) return problemCode('INTERNAL_ERROR', 500, error.message)

  const repo = new SupabaseAssignmentRulesRepository(auth.auth.supabase)
  const stored = await repo.read().catch(() => null)
  const rules = stored ?? DEFAULT_ASSIGNMENT_RULES

  return NextResponse.json({
    rules: {
      maxOrdersPerDriver: rules.maxOrdersPerDriver,
      maxRestaurantsPerDriver: rules.maxRestaurantsPerDriver,
      groupingWindowMinutes: rules.groupingWindowMinutes,
    },
    updatedAt: data?.updated_at ?? null,
  })
}

/**
 * PATCH /api/v1/admin/settings/assignment-rules
 * Body: { maxOrdersPerDriver, maxRestaurantsPerDriver, groupingWindowMinutes }.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['admin'])
  if (!auth.ok) return auth.response

  const body = await parseJson(req, UpdateSchema)
  if (!body.ok) return body.response

  const rules: AssignmentRules = {
    maxOrdersPerDriver: body.data.maxOrdersPerDriver,
    maxRestaurantsPerDriver: body.data.maxRestaurantsPerDriver,
    groupingWindowMinutes: body.data.groupingWindowMinutes,
  }

  const repo = new SupabaseAssignmentRulesRepository(auth.auth.supabase)
  try {
    const result = await repo.write(rules, auth.auth.userId)
    return NextResponse.json({ rules, updatedAt: result.updatedAt })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'persist_error'
    return problemCode('INTERNAL_ERROR', 500, msg)
  }
}
