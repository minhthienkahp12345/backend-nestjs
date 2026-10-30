import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrderType, PaymentMethod } from '../../entities/order.entity';

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  product_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType)
  order_type!: OrderType;

  @IsEnum(PaymentMethod)
  payment_method!: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
