import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Deal } from '../deals/entities/deal.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const reservationRepository = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ ...value, id: value.id ?? 1 })),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const storeRepository = {
    findOne: jest.fn(),
  };
  const productRepository = {
    findOne: jest.fn(),
  };
  const dealRepository = {
    findOne: jest.fn(),
  };
  const paymentRepository = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => ({ ...value, id: value.id ?? 1 })),
  };
  const dataSource = {
    transaction: jest.fn(),
  };
  const notificationsService = {
    notifyReservationPaid: jest.fn(),
    notifyReservationCompleted: jest.fn(),
    notifyReservationCancelled: jest.fn(),
    notifyReservationRefunded: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationRepository,
        },
        { provide: getRepositoryToken(Store), useValue: storeRepository },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(Deal), useValue: dealRepository },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: paymentRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('creates reservations as pending payment and records a pending payment', async () => {
    storeRepository.findOne.mockResolvedValue({ id: 10, name: '상점' });
    productRepository.findOne.mockResolvedValue({ id: 20, currentPrice: 3000 });
    reservationRepository.findOne.mockResolvedValue({
      id: 1,
      status: ReservationStatus.PENDING_PAYMENT,
      totalAmount: 6000,
      store: { id: 10 },
      product: { id: 20 },
      payments: [{ status: 'PENDING', amount: 6000 }],
    });

    const result = await service.create(7, {
      storeId: 10,
      productId: 20,
      quantity: 2,
    });

    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 2,
        totalAmount: 6000,
        status: ReservationStatus.PENDING_PAYMENT,
      }),
    );
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 6000, status: 'PENDING' }),
    );
    expect(result.status).toBe(ReservationStatus.PENDING_PAYMENT);
  });
});
