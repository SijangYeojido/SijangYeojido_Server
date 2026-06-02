import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { ModerationAction } from '../moderation/entities/moderation-action.entity';
import { ModerationCase } from '../moderation/entities/moderation-case.entity';
import { NotificationLog } from '../notifications/entities/notification-log.entity';
import { Report } from '../reports/entities/report.entity';
import { PaymentTransaction } from '../reservations/entities/payment-transaction.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Store } from '../stores/entities/store.entity';
import { ActionLog } from '../system/entities/action-log.entity';
import { AnalyticsService } from './analytics.service';
import { KpiDailySnapshot } from './entities/kpi-daily-snapshot.entity';

describe('AnalyticsService', () => {
  const snapshotsRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: value.id ?? 1, ...value })),
  };
  const genericRepository = {
    find: jest.fn().mockResolvedValue([]),
  };
  const storesRepository = {
    find: jest.fn().mockResolvedValue([{ id: 1, merchant: { id: 9 } }]),
  };

  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(KpiDailySnapshot), useValue: snapshotsRepository },
        { provide: getRepositoryToken(ActionLog), useValue: genericRepository },
        { provide: getRepositoryToken(Reservation), useValue: genericRepository },
        { provide: getRepositoryToken(PaymentTransaction), useValue: genericRepository },
        { provide: getRepositoryToken(Deal), useValue: genericRepository },
        { provide: getRepositoryToken(Report), useValue: genericRepository },
        { provide: getRepositoryToken(ModerationCase), useValue: genericRepository },
        { provide: getRepositoryToken(ModerationAction), useValue: genericRepository },
        { provide: getRepositoryToken(NotificationLog), useValue: genericRepository },
        { provide: getRepositoryToken(Store), useValue: storesRepository },
      ],
    }).compile();

    service = module.get(AnalyticsService);
    jest.clearAllMocks();
    snapshotsRepository.findOne.mockResolvedValue(null);
    genericRepository.find.mockResolvedValue([]);
    storesRepository.find.mockResolvedValue([{ id: 1, merchant: { id: 9 } }]);
  });

  it('builds a 7 day admin overview', async () => {
    const result = await service.adminOverview({ range: '7d' });

    expect(result.daily).toHaveLength(7);
    expect(result.summary.pickupCompletions).toBe(0);
    expect(snapshotsRepository.save).toHaveBeenCalledTimes(7);
  });

  it('blocks merchant analytics for stores not owned by merchant', async () => {
    await expect(
      service.sellerOverview(9, { range: '7d', storeId: 99 }),
    ).rejects.toThrow(ForbiddenException);
  });
});
