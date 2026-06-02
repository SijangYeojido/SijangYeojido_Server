import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketZone } from './entities/market-zone.entity';
import { Market } from './entities/market.entity';
import { Poi } from './entities/poi.entity';
import { MarketsService } from './markets.service';

describe('MarketsService', () => {
  let service: MarketsService;
  const repositoryMock = {
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketsService,
        {
          provide: getRepositoryToken(Market),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(MarketZone),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(Poi),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<MarketsService>(MarketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
