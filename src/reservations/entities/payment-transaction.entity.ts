import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'mock' })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  providerTransactionId: string | null;

  @Column('int')
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => Reservation, (reservation) => reservation.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
