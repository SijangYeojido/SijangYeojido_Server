import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CreateMarketDto,
  CreateMarketZoneDto,
  MarketQueryDto,
  UpdateMarketDto,
  UpdateMarketZoneDto,
} from './dto/market.dto';
import { MarketZone } from './entities/market-zone.entity';
import { Market } from './entities/market.entity';
import { Poi } from './entities/poi.entity';
import { StoreApprovalStatus } from '../stores/entities/store.entity';

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(Market)
    private readonly marketsRepository: Repository<Market>,
    @InjectRepository(MarketZone)
    private readonly zonesRepository: Repository<MarketZone>,
    @InjectRepository(Poi)
    private readonly poisRepository: Repository<Poi>,
  ) {}

  async findAll(query: MarketQueryDto): Promise<Market[]> {
    const builder = this.marketsRepository
      .createQueryBuilder('market')
      .leftJoinAndSelect('market.zones', 'zone')
      .orderBy('market.name', 'ASC');

    if (query.keyword) {
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('market.name ILIKE :keyword', {
            keyword: `%${query.keyword}%`,
          })
            .orWhere('market.address ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            })
            .orWhere('market.region ILIKE :keyword', {
              keyword: `%${query.keyword}%`,
            });
        }),
      );
    }

    if (query.region) {
      builder.andWhere('market.region ILIKE :region', {
        region: `%${query.region}%`,
      });
    }

    return builder.getMany();
  }

  async findOne(id: number): Promise<Market> {
    const market = await this.marketsRepository.findOne({
      where: { id },
      relations: ['zones', 'pois', 'stores', 'stores.zone', 'stores.photos'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    market.stores = (market.stores ?? []).filter(
      (store) => store.approvalStatus === StoreApprovalStatus.APPROVED,
    );

    return market;
  }

  async getInternalMap(id: number) {
    const market = await this.findOne(id);
    const stores = (market.stores ?? []).filter(
      (store) => store.approvalStatus === StoreApprovalStatus.APPROVED,
    );

    return {
      id: market.id,
      name: market.name,
      address: market.address,
      operatingHours: market.operatingHours,
      mapImageUrl: market.mapImageUrl,
      mapWidth: market.mapWidth,
      mapHeight: market.mapHeight,
      center: {
        latitude: market.latitude,
        longitude: market.longitude,
      },
      zones: market.zones ?? [],
      pois: market.pois ?? [],
      storePins: stores.map((store) => ({
        id: store.id,
        name: store.name,
        category: store.category,
        businessStatus: store.businessStatus,
        latitude: store.latitude,
        longitude: store.longitude,
        mapX: store.mapX,
        mapY: store.mapY,
        zone: store.zone,
        thumbnailUrl: store.imageUrl ?? store.photos?.[0]?.imageUrl,
      })),
    };
  }

  async create(dto: CreateMarketDto): Promise<Market> {
    return this.marketsRepository.save(this.marketsRepository.create(dto));
  }

  async update(id: number, dto: UpdateMarketDto): Promise<Market> {
    const market = await this.findOne(id);
    Object.assign(market, dto);
    return this.marketsRepository.save(market);
  }

  async remove(id: number): Promise<void> {
    const result = await this.marketsRepository.softDelete(id);
    if (!result.affected) {
      throw new NotFoundException('Market not found');
    }
  }

  async createZone(
    marketId: number,
    dto: CreateMarketZoneDto,
  ): Promise<MarketZone> {
    const market = await this.findOne(marketId);
    const zone = this.zonesRepository.create({
      ...dto,
      market,
    });
    return this.zonesRepository.save(zone);
  }

  async updateZone(
    marketId: number,
    zoneId: number,
    dto: UpdateMarketZoneDto,
  ): Promise<MarketZone> {
    const zone = await this.zonesRepository.findOne({
      where: {
        id: zoneId,
        market: { id: marketId },
      },
    });

    if (!zone) {
      throw new NotFoundException('Market zone not found');
    }

    Object.assign(zone, dto);
    return this.zonesRepository.save(zone);
  }

  async removeZone(marketId: number, zoneId: number): Promise<void> {
    const result = await this.zonesRepository
      .createQueryBuilder()
      .delete()
      .where('id = :zoneId', { zoneId })
      .andWhere('marketId = :marketId', { marketId })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Market zone not found');
    }
  }

  async findPois(marketId: number): Promise<Poi[]> {
    return this.poisRepository.find({
      where: { market: { id: marketId } },
      order: { id: 'ASC' },
    });
  }
}
