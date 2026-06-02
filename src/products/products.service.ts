import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, StoreApprovalStatus } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateProductDto,
  ProductCompareQueryDto,
  UpdateProductDto,
  UpdateProductPriceDto,
} from './dto/product.dto';
import { ProductPriceHistory } from './entities/product-price-history.entity';
import { Product, ProductStockStatus } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductPriceHistory)
    private readonly priceHistoryRepository: Repository<ProductPriceHistory>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
  ) {}

  async findByStore(storeId: number): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .where('store.id = :storeId', { storeId })
      .andWhere('store.approvalStatus = :storeApprovalStatus', {
        storeApprovalStatus: StoreApprovalStatus.APPROVED,
      })
      .andWhere('product.stockStatus NOT IN (:...hiddenStatuses)', {
        hiddenStatuses: [
          ProductStockStatus.HIDDEN,
          ProductStockStatus.DISCONTINUED,
        ],
      })
      .orderBy('product.name', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['store', 'store.market', 'priceHistories'],
      order: { priceHistories: { createdAt: 'DESC' } },
    });

    if (
      !product ||
      product.store.approvalStatus !== StoreApprovalStatus.APPROVED ||
      product.stockStatus === ProductStockStatus.HIDDEN ||
      product.stockStatus === ProductStockStatus.DISCONTINUED
    ) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async compare(query: ProductCompareQueryDto): Promise<Product[]> {
    const builder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .leftJoinAndSelect('store.market', 'market')
      .where('product.name ILIKE :name', { name: `%${query.name}%` })
      .andWhere('store.approvalStatus = :storeApprovalStatus', {
        storeApprovalStatus: StoreApprovalStatus.APPROVED,
      })
      .andWhere('product.stockStatus NOT IN (:...hiddenStatuses)', {
        hiddenStatuses: [
          ProductStockStatus.HIDDEN,
          ProductStockStatus.DISCONTINUED,
        ],
      });

    if (query.category) {
      builder.andWhere('product.category ILIKE :category', {
        category: `%${query.category}%`,
      });
    }

    if (query.marketId) {
      builder.andWhere('market.id = :marketId', {
        marketId: query.marketId,
      });
    }

    return builder.orderBy('product.currentPrice', 'ASC').getMany();
  }

  async getPriceHistory(productId: number): Promise<ProductPriceHistory[]> {
    await this.findOne(productId);
    return this.priceHistoryRepository.find({
      where: { product: { id: productId } },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    merchantId: number,
    storeId: number,
    dto: CreateProductDto,
  ): Promise<Product> {
    const store = await this.findOwnedStore(merchantId, storeId);
    const product = await this.productsRepository.save(
      this.productsRepository.create({
        ...dto,
        stockStatus: dto.stockStatus ?? ProductStockStatus.AVAILABLE,
        store,
      }),
    );

    await this.recordPriceHistory(product, merchantId, dto.currentPrice);
    return product;
  }

  async update(
    merchantId: number,
    productId: number,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOwnedProduct(merchantId, productId);
    Object.assign(product, dto);
    return this.productsRepository.save(product);
  }

  async updatePrice(
    merchantId: number,
    productId: number,
    dto: UpdateProductPriceDto,
  ): Promise<Product> {
    const product = await this.findOwnedProduct(merchantId, productId);
    product.currentPrice = dto.price;
    const saved = await this.productsRepository.save(product);
    await this.recordPriceHistory(saved, merchantId, dto.price, dto.note);
    return saved;
  }

  async remove(merchantId: number, productId: number): Promise<void> {
    const product = await this.findOwnedProduct(merchantId, productId);
    product.stockStatus = ProductStockStatus.DISCONTINUED;
    await this.productsRepository.save(product);
  }

  private async findOwnedStore(
    merchantId: number,
    storeId: number,
  ): Promise<Store> {
    const store = await this.storesRepository.findOne({
      where: {
        id: storeId,
        merchant: { id: merchantId },
      },
      relations: ['merchant'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  private async findOwnedProduct(
    merchantId: number,
    productId: number,
  ): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: {
        id: productId,
        store: { merchant: { id: merchantId } },
      },
      relations: ['store', 'store.merchant'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async recordPriceHistory(
    product: Product,
    merchantId: number,
    price: number,
    note?: string,
  ): Promise<void> {
    await this.priceHistoryRepository.save(
      this.priceHistoryRepository.create({
        product,
        price,
        note,
        changedBy: { id: merchantId } as User,
      }),
    );
  }
}
