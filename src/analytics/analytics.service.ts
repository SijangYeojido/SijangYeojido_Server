import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Not, In, Repository } from 'typeorm';
import { Deal, DealStatus } from '../deals/entities/deal.entity';
import { ModerationAction } from '../moderation/entities/moderation-action.entity';
import {
  ModerationCase,
  ModerationCaseStatus,
} from '../moderation/entities/moderation-case.entity';
import {
  NotificationDeliveryStatus,
  NotificationLog,
} from '../notifications/entities/notification-log.entity';
import { Report } from '../reports/entities/report.entity';
import {
  PaymentStatus,
  PaymentTransaction,
} from '../reservations/entities/payment-transaction.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { Store } from '../stores/entities/store.entity';
import { ActionLog } from '../system/entities/action-log.entity';
import { AnalyticsOverviewQueryDto, RebuildAnalyticsDto } from './dto/analytics.dto';
import { KpiDailySnapshot, KpiRoleScope } from './entities/kpi-daily-snapshot.entity';

type Metrics = Omit<
  KpiDailySnapshot,
  | 'id'
  | 'date'
  | 'roleScope'
  | 'marketKey'
  | 'storeKey'
  | 'marketId'
  | 'storeId'
  | 'merchantId'
  | 'generatedAt'
  | 'createdAt'
  | 'updatedAt'
>;

interface AnalyticsScope {
  roleScope: KpiRoleScope;
  marketId?: number;
  storeId?: number;
  merchantId?: number;
  storeIds?: number[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(KpiDailySnapshot)
    private readonly snapshotsRepository: Repository<KpiDailySnapshot>,
    @InjectRepository(ActionLog)
    private readonly actionLogsRepository: Repository<ActionLog>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentsRepository: Repository<PaymentTransaction>,
    @InjectRepository(Deal)
    private readonly dealsRepository: Repository<Deal>,
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(ModerationCase)
    private readonly casesRepository: Repository<ModerationCase>,
    @InjectRepository(ModerationAction)
    private readonly actionsRepository: Repository<ModerationAction>,
    @InjectRepository(NotificationLog)
    private readonly notificationLogsRepository: Repository<NotificationLog>,
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
  ) {}

  async adminOverview(query: AnalyticsOverviewQueryDto) {
    const range = this.rangeDays(query.range);
    const daily = await this.rebuildSnapshots(range, {
      roleScope: KpiRoleScope.ADMIN,
      marketId: query.marketId,
    });
    return this.overviewPayload(query.range ?? '7d', daily);
  }

  async sellerOverview(merchantId: number, query: AnalyticsOverviewQueryDto) {
    const ownedStores = await this.storesRepository.find({
      where: { merchant: { id: merchantId } },
      relations: ['merchant', 'market'],
    });
    const ownedStoreIds = ownedStores.map((store) => store.id);
    if (query.storeId && !ownedStoreIds.includes(query.storeId)) {
      throw new ForbiddenException('Store is not owned by current merchant');
    }
    if (query.storeId && !ownedStores.some((store) => store.id === query.storeId)) {
      throw new NotFoundException('Store not found');
    }

    const range = this.rangeDays(query.range);
    const daily = await this.rebuildSnapshots(range, {
      roleScope: KpiRoleScope.MERCHANT,
      merchantId,
      storeId: query.storeId,
      storeIds: query.storeId ? [query.storeId] : ownedStoreIds,
    });
    return this.overviewPayload(query.range ?? '7d', daily);
  }

  async rebuildAdmin(dto: RebuildAnalyticsDto) {
    const range = this.customRange(dto.from, dto.to);
    const daily = await this.rebuildSnapshots(range, {
      roleScope: KpiRoleScope.ADMIN,
      marketId: dto.marketId,
    });
    return { rebuilt: daily.length, daily };
  }

  private async rebuildSnapshots(days: Date[], scope: AnalyticsScope) {
    const rows: KpiDailySnapshot[] = [];
    for (const day of days) {
      rows.push(await this.rebuildDay(day, scope));
    }
    return rows;
  }

  private async rebuildDay(day: Date, scope: AnalyticsScope) {
    const date = this.dateKey(day);
    const start = this.startOfDay(day);
    const end = this.addDays(start, 1);
    const metrics = await this.computeMetrics(start, end, scope);
    const marketKey = scope.marketId?.toString() ?? 'all';
    const storeKey =
      scope.storeId?.toString() ??
      (scope.merchantId ? `merchant:${scope.merchantId}` : 'all');

    const existing = await this.snapshotsRepository.findOne({
      where: { date, roleScope: scope.roleScope, marketKey, storeKey },
    });

    const snapshot = this.snapshotsRepository.create({
      ...(existing ?? {}),
      date,
      roleScope: scope.roleScope,
      marketKey,
      storeKey,
      marketId: scope.marketId ?? null,
      storeId: scope.storeId ?? null,
      merchantId: scope.merchantId ?? null,
      ...metrics,
      generatedAt: new Date(),
    });

    return this.snapshotsRepository.save(snapshot);
  }

  private async computeMetrics(start: Date, end: Date, scope: AnalyticsScope): Promise<Metrics> {
    const [actions, reservations, payments, deals, reports, cases, moderationActions, notifications] =
      await Promise.all([
        this.actionLogsRepository.find({
          where: { createdAt: Between(start, end) },
          relations: ['user'],
        }),
        this.reservationsRepository.find({
          where: [{ createdAt: Between(start, end) }, { updatedAt: Between(start, end) }],
          relations: ['store', 'store.market'],
        }),
        this.paymentsRepository.find({
          where: { updatedAt: Between(start, end) },
          relations: ['reservation', 'reservation.store', 'reservation.store.market'],
        }),
        this.dealsRepository.find({
          where: [{ createdAt: Between(start, end) }, { status: DealStatus.LIVE }],
          relations: ['store', 'store.market'],
        }),
        this.reportsRepository.find({ where: { createdAt: Between(start, end) } }),
        this.casesRepository.find({
          where: {
            dueAt: LessThanOrEqual(end),
            status: Not(In([ModerationCaseStatus.RESOLVED, ModerationCaseStatus.REJECTED])),
          },
        }),
        this.actionsRepository.find({
          where: { createdAt: Between(start, end) },
          relations: ['case'],
        }),
        this.notificationLogsRepository.find({ where: { createdAt: Between(start, end) } }),
      ]);

    const scopedActions = actions.filter((row) => this.actionMatches(row, scope));
    const scopedReservations = reservations.filter((row) =>
      this.storeMatches(row.store, scope),
    );
    const scopedPayments = payments.filter((row) =>
      this.storeMatches(row.reservation?.store, scope),
    );
    const scopedDeals = deals.filter((row) => this.storeMatches(row.store, scope));
    const scopedReports = reports.filter((row) => this.reportMatches(row, scope));
    const scopedCases = cases.filter((row) => this.caseMatches(row, scope));
    const scopedModerationActions = moderationActions.filter((row) =>
      this.caseMatches(row.case, scope),
    );

    const metrics = this.emptyMetrics();
    metrics.marketViews = this.countActions(scopedActions, ['market.hub.view']);
    metrics.mapViews = this.countActions(scopedActions, ['market.map.view']);
    metrics.mapRenders = this.countActions(scopedActions, ['market.map.rendered']);
    metrics.searches = this.countActions(scopedActions, ['search.query', 'market.map.search']);
    metrics.filters = this.countActions(scopedActions, ['market.map.filter']);
    metrics.storeOpens = this.countActions(scopedActions, [
      'market.map.pin_select',
      'store.detail.view',
      'search.store.open',
    ]);
    metrics.dealViews = this.countActions(scopedActions, ['deal.detail.view']);
    metrics.reservationStarts = this.countActions(scopedActions, ['reservation.start']);
    metrics.reservationsCreated = scopedReservations.filter((row) =>
      this.inRange(row.createdAt, start, end),
    ).length;
    metrics.paymentSuccesses = scopedPayments.filter(
      (row) => row.status === PaymentStatus.PAID,
    ).length;
    metrics.pickupCompletions = scopedReservations.filter(
      (row) =>
        row.status === ReservationStatus.COMPLETED &&
        this.inRange(row.updatedAt, start, end),
    ).length;
    metrics.ttlExpirations = scopedReservations.filter(
      (row) =>
        row.status === ReservationStatus.EXPIRED &&
        this.inRange(row.updatedAt, start, end),
    ).length;
    metrics.cancellations = scopedReservations.filter(
      (row) =>
        row.status === ReservationStatus.CANCELLED &&
        this.inRange(row.updatedAt, start, end),
    ).length;
    metrics.refunds =
      scopedReservations.filter(
        (row) =>
          row.status === ReservationStatus.REFUNDED &&
          this.inRange(row.updatedAt, start, end),
      ).length +
      scopedPayments.filter((row) => row.status === PaymentStatus.REFUNDED).length;
    metrics.reportsCreated = scopedReports.length;
    metrics.moderationActions = scopedModerationActions.length;
    metrics.slaOverdueCases = scopedCases.length;
    metrics.notificationsSent = notifications.filter((row) =>
      [NotificationDeliveryStatus.SENT, NotificationDeliveryStatus.DRY_RUN].includes(row.status),
    ).length;
    metrics.notificationsFailed = notifications.filter(
      (row) => row.status === NotificationDeliveryStatus.FAILED,
    ).length;
    metrics.dealsCreated = scopedDeals.filter((row) => this.inRange(row.createdAt, start, end)).length;
    metrics.activeDeals = scopedDeals.filter(
      (row) => row.status === DealStatus.LIVE && row.expiresAt > start,
    ).length;
    metrics.reservationStartRate = this.rate(metrics.reservationStarts, metrics.dealViews);
    metrics.paymentSuccessRate = this.rate(metrics.paymentSuccesses, metrics.reservationsCreated);
    metrics.pickupCompletionRate = this.rate(metrics.pickupCompletions, metrics.paymentSuccesses);
    return metrics;
  }

  private overviewPayload(range: string, daily: KpiDailySnapshot[]) {
    const ordered = [...daily].sort((a, b) => a.date.localeCompare(b.date));
    return {
      range,
      generatedAt: new Date().toISOString(),
      summary: this.sumSnapshots(ordered),
      daily: ordered,
    };
  }

  private sumSnapshots(rows: KpiDailySnapshot[]) {
    const summary = this.emptyMetrics();
    for (const row of rows) {
      for (const key of Object.keys(summary) as Array<keyof Metrics>) {
        if (typeof summary[key] === 'number' && !key.endsWith('Rate')) {
          summary[key] = ((summary[key] as number) + (row[key] as number)) as never;
        }
      }
    }
    summary.reservationStartRate = this.rate(summary.reservationStarts, summary.dealViews);
    summary.paymentSuccessRate = this.rate(summary.paymentSuccesses, summary.reservationsCreated);
    summary.pickupCompletionRate = this.rate(summary.pickupCompletions, summary.paymentSuccesses);
    return summary;
  }

  private countActions(rows: ActionLog[], names: string[]) {
    return rows.filter((row) => row.action && names.includes(row.action)).length;
  }

  private actionMatches(row: ActionLog, scope: AnalyticsScope) {
    const metadata = row.metadata ?? {};
    if (scope.marketId && metadata.marketId?.toString() !== scope.marketId.toString()) {
      return false;
    }
    if (scope.storeId && metadata.storeId?.toString() !== scope.storeId.toString()) {
      return false;
    }
    if (
      scope.storeIds &&
      scope.storeIds.length > 0 &&
      metadata.storeId !== undefined &&
      metadata.storeId !== null &&
      !scope.storeIds.map(String).includes(metadata.storeId.toString())
    ) {
      return false;
    }
    return true;
  }

  private storeMatches(store: Store | undefined | null, scope: AnalyticsScope) {
    if (!store) return scope.roleScope === KpiRoleScope.ADMIN && !scope.marketId && !scope.storeId;
    if (scope.marketId && store.market?.id !== scope.marketId) return false;
    if (scope.storeId && store.id !== scope.storeId) return false;
    if (scope.storeIds && scope.storeIds.length > 0 && !scope.storeIds.includes(store.id)) {
      return false;
    }
    return true;
  }

  private reportMatches(row: Report, scope: AnalyticsScope) {
    const metadata = row.metadata ?? {};
    if (scope.marketId && metadata.marketId?.toString() !== scope.marketId.toString()) return false;
    if (scope.storeId && row.targetId !== scope.storeId && metadata.storeId?.toString() !== scope.storeId.toString()) {
      return false;
    }
    return (
      !scope.storeIds ||
      scope.storeIds.length === 0 ||
      metadata.storeId === undefined ||
      metadata.storeId === null ||
      scope.storeIds.map(String).includes(metadata.storeId.toString())
    );
  }

  private caseMatches(row: ModerationCase | undefined | null, scope: AnalyticsScope) {
    if (!row) return false;
    if (scope.storeId && row.targetId !== scope.storeId && row.targetType === 'STORE') return false;
    if (scope.storeIds && scope.storeIds.length > 0 && row.targetType === 'STORE') {
      return scope.storeIds.includes(row.targetId);
    }
    return true;
  }

  private emptyMetrics(): Metrics {
    return {
      marketViews: 0,
      mapViews: 0,
      mapRenders: 0,
      searches: 0,
      filters: 0,
      storeOpens: 0,
      dealViews: 0,
      reservationStarts: 0,
      reservationsCreated: 0,
      paymentSuccesses: 0,
      pickupCompletions: 0,
      ttlExpirations: 0,
      cancellations: 0,
      refunds: 0,
      reportsCreated: 0,
      moderationActions: 0,
      slaOverdueCases: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      dealsCreated: 0,
      activeDeals: 0,
      reservationStartRate: 0,
      paymentSuccessRate: 0,
      pickupCompletionRate: 0,
    };
  }

  private rangeDays(range: '7d' | '30d' = '7d') {
    const days = range === '30d' ? 30 : 7;
    const today = this.startOfDay(new Date());
    return Array.from({ length: days }, (_, index) => this.addDays(today, index - days + 1));
  }

  private customRange(from?: string, to?: string) {
    const start = from ? this.startOfDay(new Date(from)) : this.addDays(this.startOfDay(new Date()), -6);
    const end = to ? this.startOfDay(new Date(to)) : this.startOfDay(new Date());
    const days: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = this.addDays(cursor, 1)) {
      days.push(cursor);
    }
    return days;
  }

  private startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private dateKey(value: Date) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private inRange(value: Date, start: Date, end: Date) {
    return value >= start && value < end;
  }

  private rate(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return Number((numerator / denominator).toFixed(4));
  }
}
