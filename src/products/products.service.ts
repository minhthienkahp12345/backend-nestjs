import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(query: ProductQueryDto): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = {};
    if (query.category_id !== undefined) where.categoryId = query.category_id;

    return this.productsRepository.find({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    await this.ensureCategory(dto.category_id);
    const product = this.productsRepository.create({
      categoryId: dto.category_id,
      name: dto.name.trim(),
      price: dto.price.toFixed(2),
      imageUrl: dto.image_url ?? null,
      isAvailable: dto.is_available ?? true,
    });
    return this.productsRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    if (dto.category_id !== undefined) {
      await this.ensureCategory(dto.category_id);
      product.categoryId = dto.category_id;
    }
    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.price !== undefined) product.price = dto.price.toFixed(2);
    if (dto.image_url !== undefined) product.imageUrl = dto.image_url || null;
    if (dto.is_available !== undefined) product.isAvailable = dto.is_available;
    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findById(id);
    await this.productsRepository.remove(product);
    return { message: 'Đã xóa món ăn thành công' };
  }

  async toggleStatus(id: number): Promise<Product> {
    const product = await this.findById(id);
    product.isAvailable = !product.isAvailable;
    return this.productsRepository.save(product);
  }

  private async findById(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy món ăn với id ${id}`);
    }
    return product;
  }

  private async ensureCategory(id: number): Promise<void> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) throw new BadRequestException('Danh mục không tồn tại');
  }
}
