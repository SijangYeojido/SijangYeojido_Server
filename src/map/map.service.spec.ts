import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Market } from '../markets/entities/market.entity';
import { Store } from '../stores/entities/store.entity';
import { MapService } from './map.service';

describe('MapService', () => {
  let service: MapService;
  const queryBuilderMock = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    leftJoin: jest.fn(),
    getMany: jest.fn(),
  };
  const repositoryMock = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: getRepositoryToken(Market),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(Store),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<MapService>(MapService);

    queryBuilderMock.where.mockReturnValue(queryBuilderMock);
    queryBuilderMock.andWhere.mockReturnValue(queryBuilderMock);
    queryBuilderMock.orderBy.mockReturnValue(queryBuilderMock);
    queryBuilderMock.leftJoinAndSelect.mockReturnValue(queryBuilderMock);
    queryBuilderMock.leftJoin.mockReturnValue(queryBuilderMock);
    queryBuilderMock.getMany.mockResolvedValue([]);
    repositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws BadRequestException for invalid nearby latitude', async () => {
    await expect(service.findNearbyMarkets(NaN, 126.0, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for invalid nearby longitude', async () => {
    await expect(service.findNearbyMarkets(37.0, NaN, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for non-positive nearby radius', async () => {
    await expect(service.findNearbyMarkets(37.0, 126.0, 0)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for invalid marketId on searchStores', async () => {
    await expect(service.searchStores(NaN)).rejects.toThrow(BadRequestException);
  });

  it('searchStores builds approved store query', async () => {
    await service.searchStores();
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'store.approvalStatus = :approvalStatus',
      { approvalStatus: expect.any(String) },
    );
    expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('store.name', 'ASC');
    expect(queryBuilderMock.getMany).toHaveBeenCalled();
  });

  it('findNearbyMarkets queries by distance formula', async () => {
    await service.findNearbyMarkets(37.0, 126.0, 3);
    expect(repositoryMock.createQueryBuilder).toHaveBeenCalledWith('market');
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      expect.stringContaining('acos'),
      expect.objectContaining({
        lat: 37.0,
        lng: 126.0,
        radius: 3,
      }),
    );
  });
});
