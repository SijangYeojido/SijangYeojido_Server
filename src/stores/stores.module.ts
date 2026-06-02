import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from './entities/store.entity';
import { StorePhoto } from './entities/store-photo.entity';
import { Market } from '../markets/entities/market.entity';
import { MarketZone } from '../markets/entities/market-zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StorePhoto, Market, MarketZone])],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
