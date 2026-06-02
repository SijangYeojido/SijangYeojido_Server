import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { Report } from '../reports/entities/report.entity';
import { PaymentTransaction } from '../reservations/entities/payment-transaction.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { ModerationController } from './moderation.controller';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationCase } from './entities/moderation-case.entity';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModerationCase,
      ModerationAction,
      Report,
      Deal,
      Reservation,
      PaymentTransaction,
      Store,
      User,
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
