import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportTargetType {
  MARKET = 'MARKET',
  STORE = 'STORE',
  DEAL = 'DEAL',
  RESERVATION = 'RESERVATION',
  PRODUCT = 'PRODUCT',
  PRICE = 'PRICE',
  LOCATION = 'LOCATION',
  REVIEW = 'REVIEW',
}

export enum ReportType {
  STORE_INFO = 'STORE_INFO',
  PRICE_ERROR = 'PRICE_ERROR',
  LOCATION_ERROR = 'LOCATION_ERROR',
  FAKE_STORE = 'FAKE_STORE',
  FAKE_DEAL = 'FAKE_DEAL',
  SOLD_OUT_DEAL = 'SOLD_OUT_DEAL',
  INAPPROPRIATE_REVIEW = 'INAPPROPRIATE_REVIEW',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  PICKUP_DISPUTE = 'PICKUP_DISPUTE',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ReportTargetType })
  targetType: ReportTargetType;

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column()
  targetId: number;

  @Column('text')
  reason: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown>;

  @Column('text', { nullable: true })
  adminMemo: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
