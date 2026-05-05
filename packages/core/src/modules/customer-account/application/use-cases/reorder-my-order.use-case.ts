import type { DomainError } from '../../../../shared/errors/domain-error'
import { Result } from '../../../../shared/kernel/result'
import type { UseCase } from '../../../../shared/kernel/use-case'
import type {
  CustomerOrderDetailWithItems,
  CustomerProfileRepository,
} from '../ports/customer-profile.repository'

export type ReorderMyOrderCommand = { userId: string; orderId: string }

/**
 * Devuelve el detalle de un pedido pasado del cliente, listo para que la
 * PWA del cliente prefille el carrito y el cliente confirme el checkout.
 * No crea pedido nuevo — solo retorna la estructura para clonarla.
 */
export class ReorderMyOrderUseCase
  implements UseCase<ReorderMyOrderCommand, CustomerOrderDetailWithItems | null, DomainError>
{
  constructor(private readonly repo: CustomerProfileRepository) {}

  async execute(
    cmd: ReorderMyOrderCommand,
  ): Promise<Result<CustomerOrderDetailWithItems | null, DomainError>> {
    const detail = await this.repo.getOrderDetailWithItems(cmd.userId, cmd.orderId)
    return Result.ok(detail)
  }
}
