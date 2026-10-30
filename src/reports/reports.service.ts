import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDashboard() {
    const { start, end } = this.todayRange();
    const orderRepository = this.dataSource.getRepository(Order);

    const summary = await orderRepository
      .createQueryBuilder('purchaseOrder')
      .select('COALESCE(SUM(purchaseOrder.total_amount), 0)', 'totalRevenue')
      .addSelect('COUNT(purchaseOrder.id)', 'completedOrders')
      .where('purchaseOrder.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('purchaseOrder.created_at >= :start', { start })
      .andWhere('purchaseOrder.created_at < :end', { end })
      .getRawOne<{ totalRevenue: string; completedOrders: string }>();

    const categoryRows = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'purchaseOrder')
      .innerJoin('orderItem.product', 'product')
      .innerJoin('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COALESCE(SUM(orderItem.quantity * orderItem.price), 0)', 'revenue')
      .where('purchaseOrder.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('purchaseOrder.created_at >= :start', { start })
      .andWhere('purchaseOrder.created_at < :end', { end })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('revenue', 'DESC')
      .getRawMany<{
        categoryId: string;
        categoryName: string;
        revenue: string;
      }>();

    const topProductRows = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('orderItem')
      .innerJoin('orderItem.order', 'purchaseOrder')
      .innerJoin('orderItem.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(orderItem.quantity)', 'quantitySold')
      .addSelect('COALESCE(SUM(orderItem.quantity * orderItem.price), 0)', 'revenue')
      .where('purchaseOrder.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('purchaseOrder.created_at >= :start', { start })
      .andWhere('purchaseOrder.created_at < :end', { end })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('quantitySold', 'DESC')
      .addOrderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany<{
        productId: string;
        productName: string;
        quantitySold: string;
        revenue: string;
      }>();

    const latestOrders = await orderRepository
      .createQueryBuilder('purchaseOrder')
      .select([
        'purchaseOrder.id',
        'purchaseOrder.orderNumber',
        'purchaseOrder.totalAmount',
        'purchaseOrder.paymentMethod',
        'purchaseOrder.createdAt',
      ])
      .where('purchaseOrder.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('purchaseOrder.created_at >= :start', { start })
      .andWhere('purchaseOrder.created_at < :end', { end })
      .orderBy('purchaseOrder.created_at', 'DESC')
      .limit(10)
      .getMany();

    const totalRevenue = Number(summary?.totalRevenue ?? 0);
    const completedOrders = Number(summary?.completedOrders ?? 0);

    return {
      summary: {
        totalRevenue,
        completedOrders,
        averageOrderValue:
          completedOrders > 0 ? totalRevenue / completedOrders : 0,
      },
      categoryRevenue: categoryRows.map((row) => ({
        categoryId: Number(row.categoryId),
        categoryName: row.categoryName,
        revenue: Number(row.revenue),
      })),
      topProducts: topProductRows.map((row) => ({
        productId: Number(row.productId),
        productName: row.productName,
        quantitySold: Number(row.quantitySold),
        revenue: Number(row.revenue),
      })),
      latestOrders,
    };
  }

  private todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
}
