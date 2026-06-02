import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Between, In, Repository } from 'typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { FavoriteMarket } from '../favorites/entities/favorite-market.entity';
import { FavoriteStore } from '../favorites/entities/favorite-store.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { ActionLog, ActionLogType } from '../system/entities/action-log.entity';
import { User } from '../users/entities/user.entity';
import {
  RegisterDeviceTokenDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification.dto';
import { DevicePlatform, DeviceToken } from './entities/device-token.entity';
import {
  NotificationDeliveryStatus,
  NotificationLog,
  NotificationType,
} from './entities/notification-log.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

type NotificationPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

@Injectable()
export class NotificationsService {
  private firebaseInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DeviceToken)
    private readonly deviceTokensRepository: Repository<DeviceToken>,
    @InjectRepository(NotificationPreference)
    private readonly preferencesRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationLog)
    private readonly logsRepository: Repository<NotificationLog>,
    @InjectRepository(FavoriteMarket)
    private readonly favoriteMarketsRepository: Repository<FavoriteMarket>,
    @InjectRepository(FavoriteStore)
    private readonly favoriteStoresRepository: Repository<FavoriteStore>,
    @InjectRepository(ActionLog)
    private readonly actionLogsRepository: Repository<ActionLog>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
  ) {}

  async registerDeviceToken(userId: number, dto: RegisterDeviceTokenDto) {
    const token = dto.token.trim();
    const existing = await this.deviceTokensRepository.findOne({
      where: { token },
      relations: ['user'],
    });
    const platform = this.platform(dto.platform);

    if (existing) {
      existing.user = { id: userId } as User;
      existing.platform = platform;
      existing.appVersion = dto.appVersion ?? existing.appVersion;
      existing.deviceId = dto.deviceId ?? existing.deviceId;
      existing.isActive = true;
      return this.deviceTokensRepository.save(existing);
    }

    return this.deviceTokensRepository.save(
      this.deviceTokensRepository.create({
        token,
        platform,
        appVersion: dto.appVersion,
        deviceId: dto.deviceId,
        isActive: true,
        user: { id: userId } as User,
      }),
    );
  }

  async deactivateDeviceToken(userId: number, token: string) {
    await this.deviceTokensRepository.update(
      { token, user: { id: userId } },
      { isActive: false },
    );
    return { ok: true };
  }

  async getPreferences(userId: number) {
    return this.ensurePreferences(userId);
  }

  async updatePreferences(
    userId: number,
    dto: UpdateNotificationPreferenceDto,
  ) {
    const preferences = await this.ensurePreferences(userId);
    Object.assign(preferences, dto);
    return this.preferencesRepository.save(preferences);
  }

  async notifyDealCreated(deal: Deal): Promise<void> {
    const store = deal.store;
    const marketId = store?.market?.id;
    const storeId = store?.id;
    const userIds = await this.targetUsersForDeal(marketId, storeId);
    if (userIds.length === 0) return;

    await this.sendToUsers(
      userIds,
      NotificationType.DEAL_CREATED,
      {
        title: '즐겨찾기 시장에 오늘 특가가 떴어요',
        body: `${store?.name ?? '점포'} · ${deal.title}`,
        data: {
          route: 'deal',
          dealId: String(deal.id),
          storeId: String(storeId ?? ''),
          marketId: String(marketId ?? ''),
        },
      },
      {
        targetType: 'deal',
        targetId: deal.id,
        preference: 'dealAlerts',
        skipQuietHours: false,
      },
    );
  }

  async notifyReservationPaid(reservation: Reservation): Promise<void> {
    await this.sendToUsers(
      [reservation.user.id],
      NotificationType.RESERVATION_PAID,
      {
        title: '예약이 확정됐어요',
        body: `픽업 코드 ${reservation.pickupCode ?? ''} · 15분 안에 방문해 주세요.`,
        data: {
          route: 'pickup',
          reservationId: String(reservation.id),
          storeId: String(reservation.store?.id ?? ''),
        },
      },
      {
        targetType: 'reservation',
        targetId: reservation.id,
        preference: 'reservationAlerts',
        skipQuietHours: true,
      },
    );

    const merchantId = reservation.store?.merchant?.id;
    if (!merchantId) return;
    await this.sendToUsers(
      [merchantId],
      NotificationType.MERCHANT_NEW_RESERVATION,
      {
        title: '새 픽업 예약이 들어왔어요',
        body: `${reservation.quantity}개 · 코드 확인 후 픽업 완료 처리해 주세요.`,
        data: {
          route: 'merchant_reservations',
          reservationId: String(reservation.id),
        },
      },
      {
        targetType: 'reservation',
        targetId: reservation.id,
        preference: 'merchantAlerts',
        skipQuietHours: true,
      },
    );
  }

  async notifyReservationCompleted(reservation: Reservation): Promise<void> {
    await this.sendReservationStatus(
      reservation,
      NotificationType.RESERVATION_COMPLETED,
      '픽업이 완료됐어요',
      '이용해 주셔서 감사합니다.',
    );
  }

  async notifyReservationCancelled(reservation: Reservation): Promise<void> {
    await this.sendReservationStatus(
      reservation,
      NotificationType.RESERVATION_CANCELLED,
      '예약이 취소됐어요',
      '다음 특가를 다시 확인해 보세요.',
    );
  }

  async notifyReservationRefunded(reservation: Reservation): Promise<void> {
    await this.sendReservationStatus(
      reservation,
      NotificationType.RESERVATION_REFUNDED,
      '예약이 환불 처리됐어요',
      '취소된 수량은 특가 재고에 반영됩니다.',
    );
  }

  @Interval(60_000)
  async sendExpiringReservationReminders(): Promise<void> {
    const now = Date.now();
    const from = new Date(now + 4.5 * 60 * 1000);
    const to = new Date(now + 5.5 * 60 * 1000);
    const reservations = await this.reservationsRepository.find({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: Between(from, to),
      },
      relations: ['user', 'store'],
      take: 100,
    });

    for (const reservation of reservations) {
      const existing = await this.logsRepository.findOne({
        where: {
          type: NotificationType.RESERVATION_EXPIRING_SOON,
          targetType: 'reservation',
          targetId: reservation.id,
          user: { id: reservation.user.id },
        },
      });
      if (existing) continue;

      await this.sendToUsers(
        [reservation.user.id],
        NotificationType.RESERVATION_EXPIRING_SOON,
        {
          title: '픽업 시간이 5분 남았어요',
          body: `${reservation.store?.name ?? '점포'}에 곧 방문해 주세요.`,
          data: {
            route: 'pickup',
            reservationId: String(reservation.id),
          },
        },
        {
          targetType: 'reservation',
          targetId: reservation.id,
          preference: 'reservationAlerts',
          skipQuietHours: true,
        },
      );
    }
  }

  private async sendReservationStatus(
    reservation: Reservation,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    await this.sendToUsers(
      [reservation.user.id],
      type,
      {
        title,
        body,
        data: {
          route: 'reservation',
          reservationId: String(reservation.id),
        },
      },
      {
        targetType: 'reservation',
        targetId: reservation.id,
        preference: 'reservationAlerts',
        skipQuietHours: true,
      },
    );
  }

  private async sendToUsers(
    userIds: number[],
    type: NotificationType,
    payload: NotificationPayload,
    options: {
      targetType: string;
      targetId: number;
      preference: 'dealAlerts' | 'reservationAlerts' | 'merchantAlerts';
      skipQuietHours: boolean;
    },
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return;

    const tokens = await this.deviceTokensRepository.find({
      where: { isActive: true, user: { id: In(uniqueUserIds) } },
      relations: ['user'],
    });
    const tokensByUserId = new Map<number, DeviceToken[]>();
    for (const token of tokens) {
      const rows = tokensByUserId.get(token.user.id) ?? [];
      rows.push(token);
      tokensByUserId.set(token.user.id, rows);
    }

    for (const userId of uniqueUserIds) {
      const preferences = await this.ensurePreferences(userId);
      if (!preferences[options.preference]) {
        await this.recordLog(
          userId,
          type,
          payload,
          options,
          NotificationDeliveryStatus.SKIPPED,
        );
        continue;
      }
      if (!options.skipQuietHours && this.isQuietHours(preferences)) {
        await this.recordLog(
          userId,
          type,
          payload,
          options,
          NotificationDeliveryStatus.SKIPPED,
        );
        continue;
      }
      const existing = await this.logsRepository.findOne({
        where: {
          type,
          targetType: options.targetType,
          targetId: options.targetId,
          user: { id: userId },
        },
      });
      if (existing) continue;

      const userTokens = tokensByUserId.get(userId) ?? [];
      if (userTokens.length === 0) {
        await this.recordLog(
          userId,
          type,
          payload,
          options,
          NotificationDeliveryStatus.SKIPPED,
        );
        continue;
      }

      const status = await this.sendFcm(userTokens, payload);
      await this.recordLog(userId, type, payload, options, status);
    }
  }

  private async sendFcm(
    tokens: DeviceToken[],
    payload: NotificationPayload,
  ): Promise<NotificationDeliveryStatus> {
    if (!this.isFcmEnabled()) {
      return NotificationDeliveryStatus.DRY_RUN;
    }

    try {
      this.ensureFirebase();
      await getMessaging().sendEachForMulticast({
        tokens: tokens.map((token) => token.token),
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      return NotificationDeliveryStatus.SENT;
    } catch {
      return NotificationDeliveryStatus.FAILED;
    }
  }

  private async recordLog(
    userId: number,
    type: NotificationType,
    payload: NotificationPayload,
    options: { targetType: string; targetId: number },
    status: NotificationDeliveryStatus,
  ) {
    await this.logsRepository.save(
      this.logsRepository.create({
        type,
        title: payload.title,
        body: payload.body,
        targetType: options.targetType,
        targetId: options.targetId,
        status,
        payload: payload.data,
        user: { id: userId } as User,
      }),
    );
  }

  private async targetUsersForDeal(marketId?: number, storeId?: number) {
    const userIds = new Set<number>();
    if (storeId) {
      const storeFavorites = await this.favoriteStoresRepository.find({
        where: { store: { id: storeId } },
        relations: ['user'],
      });
      storeFavorites.forEach((row) => userIds.add(row.user.id));
    }
    if (marketId) {
      const marketFavorites = await this.favoriteMarketsRepository.find({
        where: { market: { id: marketId } },
        relations: ['user'],
      });
      marketFavorites.forEach((row) => userIds.add(row.user.id));
    }

    const recentLogs = await this.actionLogsRepository.find({
      where: { type: ActionLogType.USER_ACTION },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 500,
    });
    for (const log of recentLogs) {
      if (!log.user) continue;
      const metadata = log.metadata ?? {};
      if (
        (storeId && String(metadata.storeId ?? '') === String(storeId)) ||
        (marketId && String(metadata.marketId ?? '') === String(marketId))
      ) {
        userIds.add(log.user.id);
      }
    }
    return [...userIds];
  }

  private async ensurePreferences(userId: number) {
    const existing = await this.preferencesRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (existing) return existing;
    return this.preferencesRepository.save(
      this.preferencesRepository.create({
        user: { id: userId } as User,
      }),
    );
  }

  private platform(value?: string): DevicePlatform {
    if (value === DevicePlatform.IOS) return DevicePlatform.IOS;
    if (value === DevicePlatform.ANDROID) return DevicePlatform.ANDROID;
    if (value === DevicePlatform.WEB) return DevicePlatform.WEB;
    return DevicePlatform.UNKNOWN;
  }

  private isFcmEnabled() {
    return this.configService.get<string>('FCM_ENABLED') === 'true';
  }

  private ensureFirebase() {
    if (this.firebaseInitialized || getApps().length > 0) {
      this.firebaseInitialized = true;
      return;
    }
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase credentials are not configured');
    }
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    this.firebaseInitialized = true;
  }

  private isQuietHours(preferences: NotificationPreference) {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = this.timeToMinutes(preferences.quietHoursStart);
    const end = this.timeToMinutes(preferences.quietHoursEnd);
    if (start === end) return false;
    if (start < end) return minutes >= start && minutes < end;
    return minutes >= start || minutes < end;
  }

  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
