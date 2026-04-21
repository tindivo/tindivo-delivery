/**
 * Error base de dominio. Los errores de dominio son parte del modelo,
 * no excepciones técnicas. Viajan en Result.fail(error).
 */
export abstract class DomainError {
  abstract readonly code: string
  abstract readonly message: string
  readonly details?: Record<string, unknown>

  constructor(details?: Record<string, unknown>) {
    this.details = details
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * Error infraestructural (se lanza, no se devuelve en Result).
 * Solo para fallos técnicos: DB caída, red perdida, etc.
 */
export class InfrastructureError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'InfrastructureError'
  }
}

export class PersistenceError extends InfrastructureError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'PersistenceError'
  }
}
