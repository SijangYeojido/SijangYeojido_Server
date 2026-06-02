import { Test, TestingModule } from '@nestjs/testing';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistoryService } from './search-history.service';

describe('SearchHistoryController', () => {
  let controller: SearchHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchHistoryController],
      providers: [{ provide: SearchHistoryService, useValue: {} }],
    }).compile();

    controller = module.get<SearchHistoryController>(SearchHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
