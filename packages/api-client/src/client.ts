import type { ProblemDetails } from '@tindivo/contracts'

export type ApiClientConfig = {
  baseUrl: string
  getAuthToken?: () => Promise<string | null> | string | null
  defaultHeaders?: Record<string, string>
}

export class ApiError extends Error {
  constructor(
    readonly problem: ProblemDetails,
    readonly status: number,
  ) {
    super(problem.title)
    this.name = 'ApiError'
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  signal?: AbortSignal
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path.replace(/^\//, ''), this.config.baseUrl.replace(/\/?$/, '/'))
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }
    return url.toString()
  }

  private async getToken(): Promise<string | null> {
    if (!this.config.getAuthToken) return null
    const token = await this.config.getAuthToken()
    return token ?? null
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? 'GET'
    const token = await this.getToken()

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(this.config.defaultHeaders ?? {}),
      ...(opts.headers ?? {}),
    }
    if (token) headers.Authorization = `Bearer ${token}`
    if (opts.body) headers['Content-Type'] = 'application/json'

    const res = await fetch(this.buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'include',
    })

    if (res.status === 204) return undefined as T

    // Verificar Content-Type ANTES de parsear: una response HTML (404 page de
    // Next.js, deployment protection challenge de Vercel, redirect HTTP, error
    // de CORS preflight) explotaría JSON.parse con `Unexpected token '<'` y
    // contaminaría la consola con un SyntaxError sin stack útil en producción.
    const contentType = res.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json') || contentType.includes('+json')

    let data: unknown = null
    if (isJson) {
      const text = await res.text()
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          // Servidor dijo JSON pero entregó algo malformado — degradamos a null.
          data = null
        }
      }
    } else {
      // Drenar el body para evitar leaks de conexión, pero NO parsear.
      await res.text().catch(() => null)
    }

    if (!res.ok) {
      const problem = (data as ProblemDetails | null) ?? {
        type: 'about:blank',
        title: `HTTP ${res.status}${isJson ? '' : ' (non-JSON response)'}`,
        status: res.status,
        code: 'INTERNAL_ERROR' as const,
      }
      throw new ApiError(problem, res.status)
    }

    return data as T
  }

  get<T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'GET' })
  }
  post<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...opts, method: 'POST', body })
  }
  patch<T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PATCH', body })
  }
  delete<T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'DELETE' })
  }
}
