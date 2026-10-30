import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findAll(query: ProductQueryDto): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};

    if (query.category_id !== undefined) {
      where.categoryId = query.category_id;
    }

    return this.productsRepository.find({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async toggleStatus(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với id ${id}`);
    }

    product.isAvailable = !product.isAvailable;
    return this.productsRepository.save(product);
  }
}
