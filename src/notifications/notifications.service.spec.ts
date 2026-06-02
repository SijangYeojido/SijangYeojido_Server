import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { FavoriteMarket } from '../favorites/entities/favorite-market.entity';
import { FavoriteStore } from '../favorites/entities/favorite-store.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ActionLog } from '../system/entities/action-log.entity';
import { User } from '../users/entities/user.entity';
import { DevicePlatform, DeviceToken } from './entities/device-token.entity';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const deviceTokensRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ ...value, id: value.id ?? 1 })),
    update: jest.fn(),
    find: jest.fn(),
  };
  const preferencesRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ ...value, id: value.id ?? 1 })),
  };
  const genericRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ ...value, id: value.id ?? 1 })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'false') } },
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: deviceTokensRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: preferencesRepository,
        },
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: genericRepository,
        },
        {
          provide: getRepositoryToken(FavoriteMarket),
          useValue: genericRepository,
        },
        {
          provide: getRepositoryToken(FavoriteStore),
          useValue: genericRepository,
        },
        { provide: getRepositoryToken(ActionLog), useValue: genericRepository },
        { provide: getRepositoryToken(User), useValue: genericRepository },
        { provide: getRepositoryToken(Deal), useValue: genericRepository },
        {
          provide: getRepositoryToken(Reservation),
          useValue: genericRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('registers a new device token for the current user', async () => {
    deviceTokensRepository.findOne.mockResolvedValue(null);

    const result = await service.registerDeviceToken(7, {
      token: 'fcm-token',
      platform: DevicePlatform.IOS,
    });

    expect(deviceTokensRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fcm-token',
        platform: 'ios',
        isActive: true,
        user: { id: 7 },
      }),
    );
    expect(result.token).toBe('fcm-token');
  });

  it('creates default preferences when none exist', async () => {
    preferencesRepository.findOne.mockResolvedValue(null);

    const result = await service.getPreferences(7);

    expect(preferencesRepository.create).toHaveBeenCalledWith({
      user: { id: 7 },
    });
    expect(result.id).toBe(1);
  });
});
