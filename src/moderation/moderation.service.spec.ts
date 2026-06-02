import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Deal, DealStatus } from '../deals/entities/deal.entity';
import {
  Report,
  ReportTargetType,
  ReportType,
} from '../reports/entities/report.entity';
import { PaymentTransaction } from '../reservations/entities/payment-transaction.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { ModerationAction } from './entities/moderation-action.entity';
import { ModerationCase } from './entities/moderation-case.entity';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const casesRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve({ id: 1, ...value })),
    find: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((callback) =>
      callback({
        getRepository: jest.fn(() => ({
          findOne: jest.fn().mockResolvedValue({
            id: 10,
            status: DealStatus.LIVE,
            availableQuantity: 1,
          }),
          save: jest.fn(),
          update: jest.fn(),
          create: jest.fn((value) => value),
        })),
      }),
    ),
  };

  let service: ModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationCase), useValue: casesRepository },
        { provide: getRepositoryToken(ModerationAction), useValue: {} },
        { provide: getRepositoryToken(Report), useValue: {} },
        { provide: getRepositoryToken(Deal), useValue: {} },
        { provide: getRepositoryToken(Reservation), useValue: {} },
        { provide: getRepositoryToken(PaymentTransaction), useValue: {} },
        { provide: getRepositoryToken(Store), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(ModerationService);
    jest.clearAllMocks();
  });

  it('creates a high severity case for deal reports', async () => {
    casesRepository.findOne.mockResolvedValue(null);
    const result = await service.createCaseForReport({
      id: 1,
      targetType: ReportTargetType.DEAL,
      targetId: 10,
      reportType: ReportType.FAKE_DEAL,
      reason: '허위 특가',
    } as Report);

    expect(result.severity).toBe('HIGH');
    expect(result.dueAt).toBeInstanceOf(Date);
  });

  it('reuses open case for the same target', async () => {
    casesRepository.findOne.mockResolvedValue({ id: 7 });
    const result = await service.createCaseForReport({
      targetType: ReportTargetType.STORE,
      targetId: 3,
      reportType: ReportType.STORE_INFO,
      reason: '정보 오류',
    } as Report);

    expect(result).toEqual({ id: 7 });
    expect(casesRepository.save).not.toHaveBeenCalled();
  });
});
