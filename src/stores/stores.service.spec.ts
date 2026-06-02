import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketZone } from '../markets/entities/market-zone.entity';
import { Market } from '../markets/entities/market.entity';
import { StorePhoto } from './entities/store-photo.entity';
import { Store } from './entities/store.entity';
import { StoresService } from './stores.service';

describe('StoresService', () => {
  let service: StoresService;
  const repositoryMock = {
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        {
          provide: getRepositoryToken(Store),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(StorePhoto),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(Market),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(MarketZone),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
