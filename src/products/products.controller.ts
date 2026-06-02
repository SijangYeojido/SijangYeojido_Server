import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import {
  CreateProductDto,
  ProductCompareQueryDto,
  UpdateProductDto,
  UpdateProductPriceDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('stores/:storeId/products')
  @ApiOperation({ summary: 'List products sold by a store (PR-001)' })
  findByStore(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.productsService.findByStore(storeId);
  }

  @Get('products/compare')
  @ApiOperation({
    summary: 'Compare prices for the same product across stores (PR-005)',
  })
  compare(@Query() query: ProductCompareQueryDto) {
    return this.productsService.compare(query);
  }

  @Get('products/:id/price-history')
  @ApiOperation({
    summary: 'Get product price change history (PR-006, SY-002)',
  })
  getPriceHistory(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getPriceHistory(id);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Get product detail, price, and stock status (PR-002~004)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post('seller/stores/:storeId/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant creates a product (SE-004)' })
  create(
    @Req() request: AuthenticatedRequest,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(request.user.id, storeId, dto);
  }

  @Patch('seller/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant updates a product (SE-005)' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(request.user.id, id, dto);
  }

  @Delete('seller/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant deletes a product (SE-006)' })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.productsService.remove(request.user.id, id);
    return { deleted: true };
  }

  @Patch('seller/products/:id/price')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({
    summary: 'Merchant updates product price immediately (SE-007)',
  })
  updatePrice(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductPriceDto,
  ) {
    return this.productsService.updatePrice(request.user.id, id, dto);
  }
}
