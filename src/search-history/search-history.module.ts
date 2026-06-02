import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchHistoryService } from './search-history.service';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistory } from './entities/search-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchHistory])],
  providers: [SearchHistoryService],
  controllers: [SearchHistoryController],
})
export class SearchHistoryModule {}
