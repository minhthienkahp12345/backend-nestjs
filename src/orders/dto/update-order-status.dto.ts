import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';

export enum UpdatableOrderStatus {
  COMPLETED = OrderStatus.COMPLETED,
  CANCELLED = OrderStatus.CANCELLED,
}

export class UpdateOrderStatusDto {
  @IsEnum(UpdatableOrderStatus)
  status!: UpdatableOrderStatus;
}
