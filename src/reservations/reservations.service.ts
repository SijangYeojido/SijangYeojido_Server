import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { Deal, DealStatus } from '../deals/entities/deal.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { CreateReservationDto } from './dto/reservation.dto';
import {
  PaymentStatus,
  PaymentTransaction,
} from './entities/payment-transaction.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Store) private storesRepository: Repository<Store>,
    @InjectRepository(Product) private productsRepository: Repository<Product>,
    @InjectRepository(Deal) private dealsRepository: Repository<Deal>,
    @InjectRepository(PaymentTransaction)
    private paymentsRepository: Repository<PaymentTransaction>,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  async findMine(user: User): Promise<Reservation[]> {
    const where =
      user.role === Role.MERCHANT
        ? { store: { merchant: { id: user.id } } }
        : { user: { id: user.id } };
    const rows = await this.reservationsRepository.find({
      where,
      relations: ['store', 'store.merchant', 'product', 'deal', 'payments'],
      order: { createdAt: 'DESC' },
    });
    return this.markExpired(rows);
  }

  async create(
    userId: number,
    dto: CreateReservationDto,
  ): Promise<Reservation> {
    const quantity = dto.quantity ?? 1;
    const deal = dto.dealId
      ? await this.dealsRepository.findOne({
          where: {
            id: dto.dealId,
            status: DealStatus.LIVE,
            expiresAt: MoreThan(new Date()),
          },
          relations: ['store', 'product'],
        })
      : null;
    if (dto.dealId && !deal) throw new NotFoundException('Deal not found');

    const storeId = dto.storeId ?? deal?.store.id;
    if (!storeId)
      throw new BadRequestException('storeId or dealId is required');

    const store = await this.storesRepository.findOne({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const productId = dto.productId ?? deal?.product?.id;
    const product = productId
      ? await this.productsRepository.findOne({ where: { id: productId } })
      : null;
    if (productId && !product) throw new NotFoundException('Product not found');

    const unitPrice = deal?.dealPrice ?? product?.currentPrice ?? 0;
    const reservation = await this.reservationsRepository.save(
      this.reservationsRepository.create({
        user: { id: userId } as User,
        store,
        product: product ?? undefined,
        deal: deal ?? undefined,
        quantity,
        totalAmount: unitPrice * quantity,
        status: ReservationStatus.PENDING_PAYMENT,
      }),
    );
    await this.paymentsRepository.save(
      this.paymentsRepository.create({
        reservation,
        amount: reservation.totalAmount,
        status: PaymentStatus.PENDING,
      }),
    );

    return this.findOwnedReservation(userId, reservation.id);
  }

  async confirmMockPayment(userId: number, id: number): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservationRepository = manager.getRepository(Reservation);
      const dealRepository = manager.getRepository(Deal);
      const paymentRepository = manager.getRepository(PaymentTransaction);

      const reservation = await reservationRepository
        .createQueryBuilder('reservation')
        .setLock('pessimistic_write')
        .where('reservation.id = :id', { id })
        .andWhere('reservation."userId" = :userId', { userId })
        .getOne();
      if (!reservation) throw new NotFoundException('Reservation not found');
      if (reservation.status === ReservationStatus.ACTIVE) return reservation;
      if (reservation.status !== ReservationStatus.PENDING_PAYMENT) {
        throw new BadRequestException('Reservation is not awaiting payment');
      }

      const reservationDetails = await reservationRepository.findOneOrFail({
        where: { id: reservation.id },
        relations: ['deal'],
      });

      let deal = reservationDetails.deal;
      if (deal) {
        deal = await dealRepository.findOne({
          where: { id: deal.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!deal) throw new NotFoundException('Deal not found');
        if (
          deal.status !== DealStatus.LIVE ||
          deal.expiresAt.getTime() <= Date.now()
        ) {
          deal.status = DealStatus.EXPIRED;
          await dealRepository.save(deal);
          throw new BadRequestException('Deal is no longer live');
        }
        if (deal.availableQuantity < reservation.quantity) {
          throw new BadRequestException('Deal quantity is not enough');
        }
        deal.availableQuantity -= reservation.quantity;
        if (deal.availableQuantity === 0) {
          deal.status = DealStatus.SOLD_OUT;
        }
        await dealRepository.save(deal);
      }

      reservation.pickupCode = this.pickupCode();
      reservation.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      reservation.status = ReservationStatus.ACTIVE;
      await reservationRepository.save(reservation);

      const payment =
        (await paymentRepository.findOne({
          where: {
            reservation: { id: reservation.id },
            status: PaymentStatus.PENDING,
          },
        })) ??
        paymentRepository.create({
          reservation,
          amount: reservation.totalAmount,
          status: PaymentStatus.PENDING,
        });
      payment.status = PaymentStatus.PAID;
      payment.provider = 'mock';
      payment.providerTransactionId = `mock-${reservation.id}-${Date.now()}`;
      payment.metadata = { confirmedAt: new Date().toISOString() };
      await paymentRepository.save(payment);

      const paidReservation = await reservationRepository.findOneOrFail({
        where: { id: reservation.id },
        relations: [
          'user',
          'store',
          'store.merchant',
          'product',
          'deal',
          'payments',
        ],
      });
      await this.notificationsService.notifyReservationPaid(paidReservation);
      return paidReservation;
    });
  }

  async complete(
    user: User,
    id: number,
    pickupCode?: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: ['user', 'store', 'store.merchant'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (
      user.role !== Role.ADMIN &&
      user.role !== Role.MANAGER &&
      reservation.store.merchant?.id !== user.id
    ) {
      throw new ForbiddenException(
        'Reservation is not owned by current merchant',
      );
    }
    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException('Reservation is not active');
    }
    if (reservation.expiresAt && reservation.expiresAt.getTime() < Date.now()) {
      reservation.status = ReservationStatus.EXPIRED;
      await this.reservationsRepository.save(reservation);
      throw new BadRequestException('Reservation is expired');
    }
    if (!pickupCode || reservation.pickupCode !== pickupCode) {
      throw new BadRequestException('Pickup code does not match');
    }
    reservation.status = ReservationStatus.COMPLETED;
    const saved = await this.reservationsRepository.save(reservation);
    await this.notificationsService.notifyReservationCompleted(saved);
    return saved;
  }

  async cancel(userId: number, id: number): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservationRepository = manager.getRepository(Reservation);
      const dealRepository = manager.getRepository(Deal);
      const paymentRepository = manager.getRepository(PaymentTransaction);

      const reservation = await reservationRepository
        .createQueryBuilder('reservation')
        .setLock('pessimistic_write')
        .where('reservation.id = :id', { id })
        .andWhere('reservation."userId" = :userId', { userId })
        .getOne();
      if (!reservation) throw new NotFoundException('Reservation not found');
      if (
        reservation.status === ReservationStatus.COMPLETED ||
        reservation.status === ReservationStatus.EXPIRED
      ) {
        throw new BadRequestException('Reservation cannot be cancelled');
      }

      const wasActive = reservation.status === ReservationStatus.ACTIVE;
      reservation.status = wasActive
        ? ReservationStatus.REFUNDED
        : ReservationStatus.CANCELLED;
      await reservationRepository.save(reservation);

      const reservationDetails = await reservationRepository.findOneOrFail({
        where: { id: reservation.id },
        relations: ['deal'],
      });

      if (wasActive && reservationDetails.deal) {
        const deal = await dealRepository.findOne({
          where: { id: reservationDetails.deal.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (deal) {
          deal.availableQuantity += reservation.quantity;
          if (
            deal.status === DealStatus.SOLD_OUT &&
            deal.expiresAt > new Date()
          ) {
            deal.status = DealStatus.LIVE;
          }
          await dealRepository.save(deal);
        }
      }

      const payments = await paymentRepository.find({
        where: { reservation: { id: reservation.id } },
      });
      for (const payment of payments) {
        if (payment.status === PaymentStatus.PAID) {
          payment.status = PaymentStatus.REFUNDED;
          payment.metadata = {
            ...(payment.metadata ?? {}),
            refundedAt: new Date().toISOString(),
          };
          await paymentRepository.save(payment);
        }
      }

      const saved = await reservationRepository.findOneOrFail({
        where: { id: reservation.id },
        relations: ['user', 'store', 'product', 'deal', 'payments'],
      });
      if (saved.status === ReservationStatus.REFUNDED) {
        await this.notificationsService.notifyReservationRefunded(saved);
      } else {
        await this.notificationsService.notifyReservationCancelled(saved);
      }
      return saved;
    });
  }

  private async findOwnedReservation(
    userId: number,
    id: number,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['store', 'store.merchant', 'product', 'deal', 'payments'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  private async markExpired(rows: Reservation[]) {
    const now = Date.now();
    const expired = rows.filter(
      (row) =>
        row.status === ReservationStatus.ACTIVE &&
        row.expiresAt !== null &&
        row.expiresAt.getTime() < now,
    );
    if (expired.length > 0) {
      await this.reservationsRepository.save(
        expired.map((row) => ({ ...row, status: ReservationStatus.EXPIRED })),
      );
    }
    return rows.map((row) =>
      expired.some((expiredRow) => expiredRow.id === row.id)
        ? { ...row, status: ReservationStatus.EXPIRED }
        : row,
    ) as Reservation[];
  }

  private pickupCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
