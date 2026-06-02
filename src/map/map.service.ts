import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ViewportQueryDto } from './dto/viewport-query.dto';
import { Market } from '../markets/entities/market.entity';
import {
  Store,
  StoreApprovalStatus,
  StoreModerationStatus,
} from '../stores/entities/store.entity';

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Market)
    private marketsRepository: Repository<Market>,
    @InjectRepository(Store)
    private storesRepository: Repository<Store>,
  ) {}

  async findNearbyMarkets(
    lat: number,
    lng: number,
    radius: number,
  ): Promise<Market[]> {
    this.assertLatitudeLongitude(lat, 'lat', -90, 90);
    this.assertLatitudeLongitude(lng, 'lng', -180, 180);
    this.assertPositiveNumber(radius, 'radius');

    // In a real production system, PostGIS (ST_DWithin) is recommended.
    // For this pilot, we use a basic bounding box or raw distance formula query.
    return this.marketsRepository
      .createQueryBuilder('market')
      .where(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(market.latitude)) * cos(radians(market.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(market.latitude)))) <= :radius`,
        { lat, lng, radius },
      )
      .getMany();
  }

  async searchStores(
    marketId?: number,
    category?: string,
    keyword?: string,
  ): Promise<Store[]> {
    if (marketId !== undefined) {
      this.assertPositiveInteger(marketId, 'marketId');
    }

    const query = this.storesRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.market', 'market')
      .leftJoinAndSelect('store.zone', 'zone')
      .leftJoinAndSelect('store.photos', 'photos')
      .leftJoin('store.products', 'product')
      .where('store.approvalStatus = :approvalStatus', {
        approvalStatus: StoreApprovalStatus.APPROVED,
      })
      .andWhere('store.moderationStatus = :moderationStatus', {
        moderationStatus: StoreModerationStatus.NORMAL,
      });

    if (marketId) query.andWhere('store.marketId = :marketId', { marketId });
    if (category) {
      query.andWhere('store.category ILIKE :category', {
        category: `%${category}%`,
      });
    }
    if (keyword) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('store.name ILIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('store.category ILIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('product.name ILIKE :keyword', {
              keyword: `%${keyword}%`,
            })
            .orWhere('product.category ILIKE :keyword', {
              keyword: `%${keyword}%`,
            });
        }),
      );
    }

    return query.orderBy('store.name', 'ASC').getMany();
  }

  private assertPositiveNumber(value: number, name: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${name} must be a positive number`);
    }
  }

  private assertPositiveInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${name} must be a positive integer`);
    }
  }

  private assertLatitudeLongitude(
    value: number,
    name: string,
    min: number,
    max: number,
  ): void {
    this.assertFiniteNumber(value, name);
    if (value < min || value > max) {
      throw new BadRequestException(
        `${name} must be between ${min} and ${max}`,
      );
    }
  }

  private assertFiniteNumber(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${name} must be a valid number`);
    }
  }

  async getMarketMap(marketId: number) {
    const market = await this.marketsRepository.findOne({
      where: { id: marketId },
      relations: ['zones', 'pois', 'stores', 'stores.zone', 'stores.photos'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const storePins = (market.stores ?? [])
      .filter((store) => store.approvalStatus === StoreApprovalStatus.APPROVED)
      .filter((store) => store.moderationStatus === StoreModerationStatus.NORMAL)
      .map((store) => ({
        id: store.id,
        name: store.name,
        category: store.category,
        latitude: store.latitude,
        longitude: store.longitude,
        mapX: store.mapX,
        mapY: store.mapY,
        businessStatus: store.businessStatus,
        zone: store.zone,
        thumbnailUrl: store.imageUrl ?? store.photos?.[0]?.imageUrl,
      }));

    return {
      id: market.id,
      name: market.name,
      mapImageUrl: market.mapImageUrl,
      mapWidth: market.mapWidth,
      mapHeight: market.mapHeight,
      zones: market.zones ?? [],
      pois: market.pois ?? [],
      storePins,
    };
  }

  async getStoresInViewport(marketId: number, query: ViewportQueryDto) {
    if (query.minX > query.maxX || query.minY > query.maxY) {
      throw new BadRequestException('Invalid viewport bounds');
    }

    const stores = await this.storesRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.market', 'market')
      .leftJoinAndSelect('store.zone', 'zone')
      .leftJoinAndSelect('store.photos', 'photos')
      .where('store.marketId = :marketId', { marketId })
      .andWhere('store.approvalStatus = :approvalStatus', {
        approvalStatus: StoreApprovalStatus.APPROVED,
      })
      .andWhere('store.moderationStatus = :moderationStatus', {
        moderationStatus: StoreModerationStatus.NORMAL,
      })
      .andWhere('store.mapX BETWEEN :minX AND :maxX', {
        minX: query.minX,
        maxX: query.maxX,
      })
      .andWhere('store.mapY BETWEEN :minY AND :maxY', {
        minY: query.minY,
        maxY: query.maxY,
      })
      .orderBy('store.name', 'ASC')
      .getMany();

    return {
      viewport: query,
      stores,
    };
  }
}
