import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLoggingInterceptor } from './api-logging.interceptor';
import { ActionLog } from './entities/action-log.entity';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActionLog])],
  controllers: [SystemController],
  providers: [
    SystemService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLoggingInterceptor,
    },
  ],
  exports: [SystemService],
})
export class SystemModule {}
