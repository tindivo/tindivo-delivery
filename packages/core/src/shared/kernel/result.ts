/**
 * Result<T, E> — flujo explícito de éxito/error sin throw.
 * El dominio nunca lanza excepciones: devuelve Result.
 */
export type Result<T, E> = Success<T> | Failure<E>

class Success<T> {
  readonly isSuccess = true as const
  readonly isFailure = false as const
  constructor(readonly value: T) {}
}

class Failure<E> {
  readonly isSuccess = false as const
  readonly isFailure = true as const
  constructor(readonly error: E) {}
}

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return new Success(value)
  },
  fail<E>(error: E): Result<never, E> {
    return new Failure(error)
  },
  okVoid(): Result<void, never> {
    return new Success(undefined as undefined)
  },
}
