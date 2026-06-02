import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import { ModerationService } from '../moderation/moderation.service';

describe('ReportsService', () => {
  let service: ReportsService;
  const repositoryMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: repositoryMock,
        },
        {
          provide: ModerationService,
          useValue: { createCaseForReport: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
