import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';
import { FavoriteMarket } from './entities/favorite-market.entity';
import { FavoriteStore } from './entities/favorite-store.entity';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(FavoriteMarket), useValue: {} },
        { provide: getRepositoryToken(FavoriteStore), useValue: {} },
        { provide: getRepositoryToken(Market), useValue: {} },
        { provide: getRepositoryToken(Store), useValue: {} },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
