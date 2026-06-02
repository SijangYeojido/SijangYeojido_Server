import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteMarket } from '../favorites/entities/favorite-market.entity';
import { FavoriteStore } from '../favorites/entities/favorite-store.entity';
import { ActionLog } from '../system/entities/action-log.entity';
import { User } from '../users/entities/user.entity';
import { Deal } from '../deals/entities/deal.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      NotificationPreference,
      NotificationLog,
      FavoriteMarket,
      FavoriteStore,
      ActionLog,
      User,
      Deal,
      Reservation,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
