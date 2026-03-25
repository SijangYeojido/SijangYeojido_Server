import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapService } from './map.service';
import { MapController } from './map.controller';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Market, Store])],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
