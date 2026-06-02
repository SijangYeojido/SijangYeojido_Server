import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchHistory } from './entities/search-history.entity';
import { SearchHistoryService } from './search-history.service';

describe('SearchHistoryService', () => {
  let service: SearchHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchHistoryService,
        { provide: getRepositoryToken(SearchHistory), useValue: {} },
      ],
    }).compile();

    service = module.get<SearchHistoryService>(SearchHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
