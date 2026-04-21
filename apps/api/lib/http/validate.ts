import type { z } from 'zod'
import { problemCode } from './problem'

export async function parseJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  try {
    const raw = await req.json().catch(() => null)
    const result = schema.safeParse(raw)
    if (!result.success) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({
            type: 'https://tindivo.pe/errors/validation-error',
            title: 'Datos inválidos',
            status: 400,
            code: 'VALIDATION_ERROR',
            errors: result.error.flatten().fieldErrors,
          }),
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      }
    }
    return { ok: true, data: result.data }
  } catch {
    return { ok: false, response: problemCode('VALIDATION_ERROR', 400, 'Body inválido') }
  }
}

export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): { ok: true; data: z.infer<T> } | { ok: false; response: Response } {
  const obj: Record<string, string> = {}
  for (const [k, v] of searchParams.entries()) obj[k] = v
  const result = schema.safeParse(obj)
  if (!result.success) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          type: 'https://tindivo.pe/errors/validation-error',
          title: 'Query inválido',
          status: 400,
          code: 'VALIDATION_ERROR',
          errors: result.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    }
  }
  return { ok: true, data: result.data }
}
