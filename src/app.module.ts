import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MarketsModule } from './markets/markets.module';
import { StoresModule } from './stores/stores.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { MapModule } from './map/map.module';
import { ProductsModule } from './products/products.module';
import { SystemModule } from './system/system.module';
import { UploadsModule } from './uploads/uploads.module';
import { DealsModule } from './deals/deals.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CouponsModule } from './coupons/coupons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ModerationModule } from './moderation/moderation.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        return {
          type: 'postgres' as const,
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USER'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_NAME'),
              }),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
        };
      },
    }),
    UsersModule,
    AuthModule,
    MarketsModule,
    StoresModule,
    FavoritesModule,
    SearchHistoryModule,
    ReviewsModule,
    ReportsModule,
    MapModule,
    ProductsModule,
    SystemModule,
    UploadsModule,
    DealsModule,
    ReservationsModule,
    CouponsModule,
    NotificationsModule,
    ModerationModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
