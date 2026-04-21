import type { Result } from './result'

/**
 * Contrato genérico de caso de uso.
 * Un caso de uso = una clase con un solo método `execute`.
 */
export interface UseCase<Command, Output, Error> {
  execute(command: Command): Promise<Result<Output, Error>>
}
