import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ProductIdDto } from './dto/product-id.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Patch(':id/toggle-status')
  toggleStatus(@Param() params: ProductIdDto) {
    return this.productsService.toggleStatus(params.id);
  }
}
