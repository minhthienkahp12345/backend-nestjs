import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from './dto/create-order.dto';
import {
  UpdateOrderStatusDto,
  UpdatableOrderStatus,
} from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(
    cashierId: number,
    createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const productIds = createOrderDto.items.map((item) => item.product_id);
      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .setLock('pessimistic_read')
        .getMany();

      const productsById = new Map(products.map((product) => [product.id, product]));
      const orderItems = createOrderDto.items.map((item) => {
        const product = productsById.get(item.product_id);

        if (!product) {
          throw new NotFoundException(
            `Không tìm thấy món ăn với id ${item.product_id}`,
          );
        }

        if (!product.isAvailable) {
          throw new BadRequestException(`Món "${product.name}" hiện đã hết hàng`);
        }

        return { item, product };
      });

      const totalCents = orderItems.reduce(
        (total, { item, product }) =>
          total + this.toCents(product.price) * item.quantity,
        0,
      );
      const orderNumber = await this.nextOrderNumber(manager);
      const orderRepository = manager.getRepository(Order);
      const order = orderRepository.create({
        cashierId,
        orderNumber,
        totalAmount: this.fromCents(totalCents),
        paymentMethod: createOrderDto.payment_method,
        orderType: createOrderDto.order_type,
        status: OrderStatus.PENDING,
      });
      const savedOrder = await orderRepository.save(order);

      const orderItemRepository = manager.getRepository(OrderItem);
      const savedItems = await orderItemRepository.save(
        orderItems.map(({ item, product }) =>
          orderItemRepository.create({
            orderId: savedOrder.id,
            productId: product.id,
            quantity: item.quantity,
            price: product.price,
            note: item.note ?? null,
          }),
        ),
      );

      savedOrder.items = savedItems;
      return savedOrder;
    });
  }

  findToday(): Promise<Order[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.dataSource
      .getRepository(Order)
      .createQueryBuilder('purchaseOrder')
      .leftJoinAndSelect('purchaseOrder.items', 'orderItem')
      .leftJoinAndSelect('orderItem.product', 'product')
      .leftJoinAndSelect('purchaseOrder.cashier', 'cashier')
      .where('purchaseOrder.created_at >= :start', { start })
      .andWhere('purchaseOrder.created_at < :end', { end })
      .orderBy('purchaseOrder.order_number', 'ASC')
      .getMany();
  }

  async updateStatus(
    id: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const repository = this.dataSource.getRepository(Order);
    const order = await repository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với id ${id}`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Chỉ đơn hàng đang chờ mới được cập nhật');
    }

    order.status =
      updateOrderStatusDto.status === UpdatableOrderStatus.COMPLETED
        ? OrderStatus.COMPLETED
        : OrderStatus.CANCELLED;
    return repository.save(order);
  }

  private async nextOrderNumber(manager: EntityManager): Promise<number> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const result = await manager
      .getRepository(Order)
      .createQueryBuilder('order')
      .select('COALESCE(MAX(order.order_number), 0) + 1', 'next')
      .where('order.created_at >= :start AND order.created_at < :end', {
        start,
        end,
      })
      .getRawOne<{ next: string }>();

    return Number(result?.next ?? 1);
  }

  private toCents(value: string): number {
    return Math.round(Number(value) * 100);
  }

  private fromCents(value: number): string {
    return (value / 100).toFixed(2);
  }
}
