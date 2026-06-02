import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Reservation } from './entities/reservation.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      PaymentTransaction,
      Store,
      Product,
      Deal,
    ]),
    NotificationsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
