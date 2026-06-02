import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { FavoriteMarket } from './entities/favorite-market.entity';
import { FavoriteStore } from './entities/favorite-store.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteMarket)
    private favoriteMarketsRepository: Repository<FavoriteMarket>,
    @InjectRepository(FavoriteStore)
    private favoriteStoresRepository: Repository<FavoriteStore>,
    @InjectRepository(Market)
    private marketsRepository: Repository<Market>,
    @InjectRepository(Store)
    private storesRepository: Repository<Store>,
  ) {}

  async findAll(userId: number) {
    const [markets, stores] = await Promise.all([
      this.favoriteMarketsRepository.find({
        where: { user: { id: userId } },
        relations: ['market'],
        order: { createdAt: 'DESC' },
      }),
      this.favoriteStoresRepository.find({
        where: { user: { id: userId } },
        relations: ['store', 'store.market', 'store.zone', 'store.photos'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    return { markets, stores };
  }

  async addMarket(userId: number, marketId: number) {
    const market = await this.marketsRepository.findOne({
      where: { id: marketId },
    });
    if (!market) throw new NotFoundException('Market not found');

    const existing = await this.favoriteMarketsRepository.findOne({
      where: { user: { id: userId }, market: { id: marketId } },
      relations: ['market'],
    });
    if (existing) return existing;

    return this.favoriteMarketsRepository.save(
      this.favoriteMarketsRepository.create({
        user: { id: userId } as User,
        market,
      }),
    );
  }

  async removeMarket(userId: number, marketId: number) {
    await this.favoriteMarketsRepository
      .createQueryBuilder()
      .delete()
      .where('"userId" = :userId', { userId })
      .andWhere('"marketId" = :marketId', { marketId })
      .execute();
  }

  async addStore(userId: number, storeId: number) {
    const store = await this.storesRepository.findOne({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const existing = await this.favoriteStoresRepository.findOne({
      where: { user: { id: userId }, store: { id: storeId } },
      relations: ['store'],
    });
    if (existing) return existing;

    return this.favoriteStoresRepository.save(
      this.favoriteStoresRepository.create({
        user: { id: userId } as User,
        store,
      }),
    );
  }

  async removeStore(userId: number, storeId: number) {
    await this.favoriteStoresRepository
      .createQueryBuilder()
      .delete()
      .where('"userId" = :userId', { userId })
      .andWhere('"storeId" = :storeId', { storeId })
      .execute();
  }
}
