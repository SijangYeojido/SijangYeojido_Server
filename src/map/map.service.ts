import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Market)
    private marketsRepository: Repository<Market>,
    @InjectRepository(Store)
    private storesRepository: Repository<Store>,
  ) {}

  async findNearbyMarkets(lat: number, lng: number, radius: number): Promise<Market[]> {
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

  async searchStores(marketId?: number, category?: string, keyword?: string): Promise<Store[]> {
    const query = this.storesRepository.createQueryBuilder('store');
    
    if (marketId) query.andWhere('store.marketId = :marketId', { marketId });
    if (category) query.andWhere('store.category = :category', { category });
    if (keyword) query.andWhere('store.name LIKE :keyword', { keyword: `%${keyword}%` });

    return query.getMany();
  }
}
