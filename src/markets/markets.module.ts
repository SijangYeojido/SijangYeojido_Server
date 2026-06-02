import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { Market } from './entities/market.entity';
import { Poi } from './entities/poi.entity';
import { MarketZone } from './entities/market-zone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Market, Poi, MarketZone])],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
