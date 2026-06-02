import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { FavoriteMarket } from './entities/favorite-market.entity';
import { FavoriteStore } from './entities/favorite-store.entity';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FavoriteMarket, FavoriteStore, Market, Store]),
  ],
  providers: [FavoritesService],
  controllers: [FavoritesController],
})
export class FavoritesModule {}
