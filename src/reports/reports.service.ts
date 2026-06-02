import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './dto/report.dto';
import { Report } from './entities/report.entity';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    private readonly moderationService: ModerationService,
  ) {}

  async create(reporterId: number, dto: CreateReportDto): Promise<Report> {
    const report = this.reportsRepository.create({
      ...dto,
      reporter: { id: reporterId } as User,
    });
    const saved = await this.reportsRepository.save(report);
    await this.moderationService.createCaseForReport(saved);
    return saved;
  }

  async findAll(query: ReportQueryDto): Promise<Report[]> {
    return this.reportsRepository.find({
      where: query.status ? { status: query.status } : {},
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, dto: UpdateReportStatusDto): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['reporter'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = dto.status;
    if (dto.adminMemo !== undefined) {
      report.adminMemo = dto.adminMemo;
    }
    return this.reportsRepository.save(report);
  }
}
