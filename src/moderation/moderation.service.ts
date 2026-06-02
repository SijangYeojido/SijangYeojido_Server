import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Deal, DealStatus } from '../deals/entities/deal.entity';
import { Report, ReportStatus, ReportTargetType } from '../reports/entities/report.entity';
import {
  PaymentStatus,
  PaymentTransaction,
} from '../reservations/entities/payment-transaction.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import {
  Store,
  StoreModerationStatus,
} from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateModerationActionDto,
  ModerationCaseQueryDto,
} from './dto/moderation.dto';
import {
  ModerationAction,
  ModerationActionType,
} from './entities/moderation-action.entity';
import {
  ModerationCase,
  ModerationCaseStatus,
  ModerationSeverity,
} from './entities/moderation-case.entity';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ModerationCase)
    private readonly casesRepository: Repository<ModerationCase>,
    @InjectRepository(ModerationAction)
    private readonly actionsRepository: Repository<ModerationAction>,
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Deal)
    private readonly dealsRepository: Repository<Deal>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createCaseForReport(report: Report): Promise<ModerationCase> {
    const existing = await this.casesRepository.findOne({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        status: ModerationCaseStatus.OPEN,
      },
    });

    if (existing) {
      return existing;
    }

    const severity = this.severityFor(report);
    return this.casesRepository.save(
      this.casesRepository.create({
        targetType: report.targetType,
        targetId: report.targetId,
        primaryReport: report,
        severity,
        title: `${report.reportType} 신고`,
        summary: report.reason,
        dueAt: this.dueAt(severity),
      }),
    );
  }

  findCases(query: ModerationCaseQueryDto): Promise<ModerationCase[]> {
    return this.casesRepository.find({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
      },
      relations: ['primaryReport', 'primaryReport.reporter', 'assignee', 'actions', 'actions.actor'],
      order: { createdAt: 'DESC', actions: { createdAt: 'DESC' } },
    });
  }

  async findCase(id: number): Promise<ModerationCase> {
    const moderationCase = await this.casesRepository.findOne({
      where: { id },
      relations: ['primaryReport', 'primaryReport.reporter', 'assignee', 'actions', 'actions.actor'],
      order: { actions: { createdAt: 'DESC' } },
    });
    if (!moderationCase) throw new NotFoundException('Moderation case not found');
    return moderationCase;
  }

  async assign(id: number, assigneeId: number): Promise<ModerationCase> {
    const moderationCase = await this.findCase(id);
    const assignee = await this.usersRepository.findOne({ where: { id: assigneeId } });
    if (!assignee) throw new NotFoundException('Assignee not found');
    moderationCase.assignee = assignee;
    moderationCase.status = ModerationCaseStatus.IN_REVIEW;
    return this.casesRepository.save(moderationCase);
  }

  async createAction(
    actorId: number,
    caseId: number,
    dto: CreateModerationActionDto,
  ): Promise<ModerationCase> {
    const moderationCase = await this.findCase(caseId);

    await this.dataSource.transaction(async (manager) => {
      switch (dto.type) {
        case ModerationActionType.TEMP_HIDE_TARGET:
          await this.hideTarget(manager, moderationCase, dto.note);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.RESTORE_TARGET:
          await this.restoreTarget(manager, moderationCase);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.FORCE_END_DEAL:
          await this.forceEndDeal(manager, dto.targetId ?? moderationCase.targetId);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.REFUND_RESERVATION:
          await this.refundReservation(manager, dto.targetId ?? moderationCase.targetId);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.WARN_MERCHANT:
          await this.warnMerchant(manager, moderationCase, dto.note);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.SUSPEND_STORE:
          await this.suspendStore(manager, moderationCase, dto.note);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.BLOCK_MERCHANT_DEALS:
          await this.blockMerchantDeals(manager, moderationCase, dto.durationHours ?? 24, dto.note);
          moderationCase.status = ModerationCaseStatus.ACTIONED;
          break;
        case ModerationActionType.RESOLVE_CASE:
          moderationCase.status = ModerationCaseStatus.RESOLVED;
          await this.resolvePrimaryReport(manager, moderationCase, ReportStatus.RESOLVED, dto.note);
          break;
        case ModerationActionType.REJECT_CASE:
          moderationCase.status = ModerationCaseStatus.REJECTED;
          await this.resolvePrimaryReport(manager, moderationCase, ReportStatus.REJECTED, dto.note);
          break;
        case ModerationActionType.ADD_NOTE:
          moderationCase.status =
            moderationCase.status === ModerationCaseStatus.OPEN
              ? ModerationCaseStatus.IN_REVIEW
              : moderationCase.status;
          break;
      }

      await manager.getRepository(ModerationCase).save(moderationCase);
      await manager.getRepository(ModerationAction).save(
        manager.getRepository(ModerationAction).create({
          case: { id: caseId } as ModerationCase,
          actor: { id: actorId } as User,
          type: dto.type,
          note: dto.note ?? null,
          metadata: {
            targetType: moderationCase.targetType,
            targetId: dto.targetId ?? moderationCase.targetId,
            durationHours: dto.durationHours,
          },
        }),
      );
    });

    return this.findCase(caseId);
  }

  private async hideTarget(
    manager: EntityManager,
    moderationCase: ModerationCase,
    note?: string,
  ) {
    if (moderationCase.targetType !== ReportTargetType.STORE) {
      throw new BadRequestException('Only stores can be hidden in v1');
    }
    const store = await manager.getRepository(Store).findOne({
      where: { id: moderationCase.targetId },
    });
    if (!store) throw new NotFoundException('Store not found');
    store.moderationStatus = StoreModerationStatus.HIDDEN;
    store.moderationReason = note ?? 'Moderation hidden';
    await manager.getRepository(Store).save(store);
  }

  private async restoreTarget(
    manager: EntityManager,
    moderationCase: ModerationCase,
  ) {
    if (moderationCase.targetType !== ReportTargetType.STORE) {
      throw new BadRequestException('Only stores can be restored in v1');
    }
    const store = await manager.getRepository(Store).findOne({
      where: { id: moderationCase.targetId },
    });
    if (!store) throw new NotFoundException('Store not found');
    store.moderationStatus = StoreModerationStatus.NORMAL;
    store.moderationReason = null;
    await manager.getRepository(Store).save(store);
  }

  private async forceEndDeal(
    manager: EntityManager,
    dealId: number,
  ) {
    const deal = await manager.getRepository(Deal).findOne({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (deal.status === DealStatus.ENDED) {
      throw new BadRequestException('Deal is already ended');
    }
    deal.status = DealStatus.ENDED;
    await manager.getRepository(Deal).save(deal);
  }

  private async refundReservation(
    manager: EntityManager,
    reservationId: number,
  ) {
    const reservation = await manager.getRepository(Reservation).findOne({
      where: { id: reservationId },
      relations: ['deal', 'payments'],
      lock: { mode: 'pessimistic_write' },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status === ReservationStatus.REFUNDED) {
      throw new BadRequestException('Reservation is already refunded');
    }
    const paidPayments = (reservation.payments ?? []).filter(
      (payment) => payment.status === PaymentStatus.PAID,
    );
    if (paidPayments.length === 0) {
      throw new BadRequestException('Reservation has no paid payment');
    }

    if (reservation.status === ReservationStatus.ACTIVE && reservation.deal) {
      const deal = await manager.getRepository(Deal).findOne({
        where: { id: reservation.deal.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (deal) {
        deal.availableQuantity += reservation.quantity;
        if (deal.status === DealStatus.SOLD_OUT && deal.expiresAt > new Date()) {
          deal.status = DealStatus.LIVE;
        }
        await manager.getRepository(Deal).save(deal);
      }
    }

    reservation.status = ReservationStatus.REFUNDED;
    await manager.getRepository(Reservation).save(reservation);
    for (const payment of paidPayments) {
      payment.status = PaymentStatus.REFUNDED;
      payment.metadata = {
        ...(payment.metadata ?? {}),
        moderationRefundedAt: new Date().toISOString(),
      };
      await manager.getRepository(PaymentTransaction).save(payment);
    }
  }

  private async warnMerchant(
    manager: EntityManager,
    moderationCase: ModerationCase,
    note?: string,
  ) {
    const merchant = await this.findMerchantForCase(manager, moderationCase);
    merchant.moderationMemo = [merchant.moderationMemo, note ?? 'Moderation warning']
      .filter(Boolean)
      .join('\n');
    await manager.getRepository(User).save(merchant);
  }

  private async suspendStore(
    manager: EntityManager,
    moderationCase: ModerationCase,
    note?: string,
  ) {
    const store = await this.findStoreForCase(manager, moderationCase);
    store.moderationStatus = StoreModerationStatus.SUSPENDED;
    store.moderationReason = note ?? 'Moderation suspended';
    await manager.getRepository(Store).save(store);
  }

  private async blockMerchantDeals(
    manager: EntityManager,
    moderationCase: ModerationCase,
    durationHours: number,
    note?: string,
  ) {
    const merchant = await this.findMerchantForCase(manager, moderationCase);
    merchant.dealBlockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    merchant.moderationMemo = [merchant.moderationMemo, note ?? 'Deal creation blocked']
      .filter(Boolean)
      .join('\n');
    await manager.getRepository(User).save(merchant);
  }

  private async resolvePrimaryReport(
    manager: EntityManager,
    moderationCase: ModerationCase,
    status: ReportStatus,
    memo?: string,
  ) {
    if (!moderationCase.primaryReport) return;
    await manager.getRepository(Report).update(moderationCase.primaryReport.id, {
      status,
      adminMemo: memo,
    });
  }

  private async findStoreForCase(
    manager: EntityManager,
    moderationCase: ModerationCase,
  ): Promise<Store> {
    if (moderationCase.targetType === ReportTargetType.STORE) {
      const store = await manager.getRepository(Store).findOne({
        where: { id: moderationCase.targetId },
        relations: ['merchant'],
      });
      if (!store) throw new NotFoundException('Store not found');
      return store;
    }
    if (moderationCase.targetType === ReportTargetType.DEAL) {
      const deal = await manager.getRepository(Deal).findOne({
        where: { id: moderationCase.targetId },
        relations: ['store', 'store.merchant'],
      });
      if (!deal?.store) throw new NotFoundException('Deal store not found');
      return deal.store;
    }
    if (moderationCase.targetType === ReportTargetType.RESERVATION) {
      const reservation = await manager.getRepository(Reservation).findOne({
        where: { id: moderationCase.targetId },
        relations: ['store', 'store.merchant'],
      });
      if (!reservation?.store) {
        throw new NotFoundException('Reservation store not found');
      }
      return reservation.store;
    }
    throw new BadRequestException('Target does not resolve to a store');
  }

  private async findMerchantForCase(
    manager: EntityManager,
    moderationCase: ModerationCase,
  ): Promise<User> {
    const store = await this.findStoreForCase(manager, moderationCase);
    if (!store.merchant) throw new NotFoundException('Merchant not found');
    return store.merchant;
  }

  private severityFor(report: Report) {
    if (
      report.targetType === ReportTargetType.RESERVATION ||
      ['PAYMENT_DISPUTE', 'PICKUP_DISPUTE'].includes(report.reportType)
    ) {
      return ModerationSeverity.HIGH;
    }
    if (report.targetType === ReportTargetType.DEAL) {
      return ModerationSeverity.HIGH;
    }
    return ModerationSeverity.MEDIUM;
  }

  private dueAt(severity: ModerationSeverity) {
    const hours = severity === ModerationSeverity.HIGH ? 4 : 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
}
