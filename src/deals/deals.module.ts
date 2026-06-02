import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { Deal } from './entities/deal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deal, Store, Product, User]),
    NotificationsModule,
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
