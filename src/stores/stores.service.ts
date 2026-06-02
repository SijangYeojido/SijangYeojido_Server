import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { MarketZone } from '../markets/entities/market-zone.entity';
import { Market } from '../markets/entities/market.entity';
import { ProductStockStatus } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  AdminStoreQueryDto,
  ApproveStoreDto,
  CreateStoreDto,
  CreateStorePhotoDto,
  StoreQueryDto,
  UpdateStoreDto,
} from './dto/store.dto';
import {
  Store,
  StoreApprovalStatus,
  StoreModerationStatus,
} from './entities/store.entity';
import { StorePhoto } from './entities/store-photo.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(StorePhoto)
    private readonly photosRepository: Repository<StorePhoto>,
    @InjectRepository(Market)
    private readonly marketsRepository: Repository<Market>,
    @InjectRepository(MarketZone)
    private readonly zonesRepository: Repository<MarketZone>,
  ) {}

  async findByMarket(
    marketId: number,
    query: StoreQueryDto,
    includePending = false,
  ): Promise<Store[]> {
    const builder = this.baseStoreQuery()
      .where('store.marketId = :marketId', { marketId })
      .orderBy('store.name', 'ASC')
      .addOrderBy('photos.sortOrder', 'ASC');

    if (!includePending) {
      builder.andWhere('store.approvalStatus = :approvalStatus', {
        approvalStatus: StoreApprovalStatus.APPROVED,
      });
      this.onlyPublicStores(builder);
    }

    this.applyStoreSearch(builder, query);
    return builder.getMany();
  }

  async search(query: StoreQueryDto): Promise<Store[]> {
    const builder = this.baseStoreQuery()
      .leftJoin('store.products', 'product')
      .where('store.approvalStatus = :approvalStatus', {
        approvalStatus: StoreApprovalStatus.APPROVED,
      });

    this.onlyPublicStores(builder);
    builder
      .orderBy('store.name', 'ASC')
      .addOrderBy('photos.sortOrder', 'ASC');

    this.applyStoreSearch(builder, query, true);
    return builder.getMany();
  }

  async findOwnedStores(merchantId: number): Promise<Store[]> {
    return this.baseStoreQuery()
      .leftJoinAndSelect(
        'store.products',
        'product',
        'product.stockStatus != :discontinuedStatus',
        { discontinuedStatus: ProductStockStatus.DISCONTINUED },
      )
      .where('store.merchantId = :merchantId', { merchantId })
      .orderBy('store.name', 'ASC')
      .addOrderBy('photos.sortOrder', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .getMany();
  }

  async findForAdmin(query: AdminStoreQueryDto): Promise<Store[]> {
    const builder = this.baseStoreQuery()
      .leftJoinAndSelect('store.merchant', 'merchant')
      .orderBy('store.createdAt', 'DESC')
      .addOrderBy('photos.sortOrder', 'ASC');

    if (query.approvalStatus) {
      builder.where('store.approvalStatus = :approvalStatus', {
        approvalStatus: query.approvalStatus,
      });
    }

    this.applyStoreSearch(builder, query);
    return builder.getMany();
  }

  async findOne(id: number, includePending = false): Promise<Store> {
    const store = await this.storesRepository.findOne({
      where: { id },
      relations: [
        'market',
        'zone',
        'merchant',
        'photos',
        'products',
        'products.priceHistories',
      ],
      order: {
        photos: { sortOrder: 'ASC' },
        products: { name: 'ASC' },
      },
    });

    if (
      !store ||
      (!includePending &&
        (store.approvalStatus !== StoreApprovalStatus.APPROVED ||
          store.moderationStatus !== StoreModerationStatus.NORMAL))
    ) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async findLocation(id: number) {
    const store = await this.findOne(id);
    return {
      id: store.id,
      name: store.name,
      market: store.market,
      zone: store.zone,
      latitude: store.latitude,
      longitude: store.longitude,
      mapX: store.mapX,
      mapY: store.mapY,
      building: store.building,
      floor: store.floor,
      unitNo: store.unitNo,
    };
  }

  async createMerchantStore(
    merchantId: number,
    dto: CreateStoreDto,
  ): Promise<Store> {
    const market = await this.getMarket(dto.marketId);
    const zone = dto.zoneId
      ? await this.getZone(dto.zoneId, market.id)
      : undefined;
    const store = this.storesRepository.create({
      ...this.getStoreValues(dto),
      regularHolidays: dto.regularHolidays ?? [],
      temporaryHolidays: dto.temporaryHolidays ?? [],
      paymentMethods: dto.paymentMethods ?? [],
      approvalStatus: StoreApprovalStatus.PENDING,
      market,
      zone,
      merchant: { id: merchantId } as User,
    });

    return this.storesRepository.save(store);
  }

  async updateMerchantStore(
    merchantId: number,
    storeId: number,
    dto: UpdateStoreDto,
  ): Promise<Store> {
    const store = await this.findOwnedStore(merchantId, storeId);
    await this.applyStoreUpdates(store, dto);
    return this.storesRepository.save(store);
  }

  async addPhoto(
    merchantId: number,
    storeId: number,
    dto: CreateStorePhotoDto,
  ): Promise<StorePhoto> {
    const store = await this.findOwnedStore(merchantId, storeId);
    const photo = this.photosRepository.create({
      imageUrl: dto.imageUrl,
      caption: dto.caption,
      sortOrder: dto.sortOrder ?? 0,
      store,
    });
    return this.photosRepository.save(photo);
  }

  async removePhoto(
    merchantId: number,
    storeId: number,
    photoId: number,
  ): Promise<void> {
    await this.findOwnedStore(merchantId, storeId);
    const result = await this.photosRepository
      .createQueryBuilder()
      .delete()
      .where('id = :photoId', { photoId })
      .andWhere('storeId = :storeId', { storeId })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Store photo not found');
    }
  }

  async approveStore(id: number, dto: ApproveStoreDto): Promise<Store> {
    const store = await this.findOne(id, true);
    store.approvalStatus = dto.approvalStatus;
    return this.storesRepository.save(store);
  }

  async adminUpdateStore(id: number, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.findOne(id, true);
    await this.applyStoreUpdates(store, dto);
    return this.storesRepository.save(store);
  }

  async remove(id: number): Promise<void> {
    const result = await this.storesRepository.softDelete(id);
    if (!result.affected) {
      throw new NotFoundException('Store not found');
    }
  }

  private baseStoreQuery() {
    return this.storesRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.market', 'market')
      .leftJoinAndSelect('store.zone', 'zone')
      .leftJoinAndSelect('store.photos', 'photos');
  }

  private onlyPublicStores(
    builder: ReturnType<Repository<Store>['createQueryBuilder']>,
  ): void {
    builder.andWhere('store.moderationStatus = :moderationStatus', {
      moderationStatus: StoreModerationStatus.NORMAL,
    });
  }

  private applyStoreSearch(
    builder: ReturnType<Repository<Store>['createQueryBuilder']>,
    query: StoreQueryDto,
    includeProducts = false,
  ): void {
    if (query.category) {
      builder.andWhere('store.category ILIKE :category', {
        category: `%${query.category}%`,
      });
    }

    if (query.keyword) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('store.name ILIKE :keyword', {
            keyword: `%${query.keyword}%`,
          })
            .orWhere('store.description ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            })
            .orWhere('store.category ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            });

          if (includeProducts) {
            qb.orWhere('product.name ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            }).orWhere('product.category ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            });
          }
        }),
      );
    }
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
      relations: ['market', 'zone', 'merchant'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  private async applyStoreUpdates(
    store: Store,
    dto: UpdateStoreDto,
  ): Promise<void> {
    if (dto.zoneId !== undefined) {
      store.zone = await this.getZone(dto.zoneId, store.market.id);
    }

    Object.assign(store, this.getStoreValues(dto));
  }

  private getStoreValues(dto: CreateStoreDto | UpdateStoreDto): Partial<Store> {
    const values: Partial<Store> = {};

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.category !== undefined) values.category = dto.category;
    if (dto.phoneNumber !== undefined) values.phoneNumber = dto.phoneNumber;
    if (dto.openingTime !== undefined) values.openingTime = dto.openingTime;
    if (dto.closingTime !== undefined) values.closingTime = dto.closingTime;
    if (dto.regularHolidays !== undefined) {
      values.regularHolidays = dto.regularHolidays;
    }
    if (dto.temporaryHolidays !== undefined) {
      values.temporaryHolidays = dto.temporaryHolidays;
    }
    if (dto.paymentMethods !== undefined) {
      values.paymentMethods = dto.paymentMethods;
    }
    if (dto.businessStatus !== undefined) {
      values.businessStatus = dto.businessStatus;
    }
    if (dto.imageUrl !== undefined) values.imageUrl = dto.imageUrl;
    if (dto.addressDetail !== undefined) {
      values.addressDetail = dto.addressDetail;
    }
    if (dto.building !== undefined) values.building = dto.building;
    if (dto.floor !== undefined) values.floor = dto.floor;
    if (dto.unitNo !== undefined) values.unitNo = dto.unitNo;
    if (dto.latitude !== undefined) values.latitude = dto.latitude;
    if (dto.longitude !== undefined) values.longitude = dto.longitude;
    if (dto.mapX !== undefined) values.mapX = dto.mapX;
    if (dto.mapY !== undefined) values.mapY = dto.mapY;

    return values;
  }

  private async getMarket(marketId: number): Promise<Market> {
    const market = await this.marketsRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    return market;
  }

  private async getZone(zoneId: number, marketId: number): Promise<MarketZone> {
    const zone = await this.zonesRepository.findOne({
      where: { id: zoneId },
      relations: ['market'],
    });

    if (!zone) {
      throw new NotFoundException('Market zone not found');
    }

    if (zone.market.id !== marketId) {
      throw new BadRequestException('Zone does not belong to the store market');
    }

    return zone;
  }
}
