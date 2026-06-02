import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { ModerationAction } from '../moderation/entities/moderation-action.entity';
import { ModerationCase } from '../moderation/entities/moderation-case.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { Report } from '../reports/entities/report.entity';
import { PaymentTransaction } from '../reservations/entities/payment-transaction.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Store } from '../stores/entities/store.entity';
import { ActionLog } from '../system/entities/action-log.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { KpiDailySnapshot } from './entities/kpi-daily-snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KpiDailySnapshot,
      ActionLog,
      Reservation,
      PaymentTransaction,
      Deal,
      Report,
      ModerationCase,
      ModerationAction,
      NotificationLog,
      Store,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
