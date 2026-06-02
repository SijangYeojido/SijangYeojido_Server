import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  DEAL_CREATED = 'DEAL_CREATED',
  RESERVATION_PAID = 'RESERVATION_PAID',
  RESERVATION_EXPIRING_SOON = 'RESERVATION_EXPIRING_SOON',
  RESERVATION_COMPLETED = 'RESERVATION_COMPLETED',
  RESERVATION_CANCELLED = 'RESERVATION_CANCELLED',
  RESERVATION_REFUNDED = 'RESERVATION_REFUNDED',
  MERCHANT_NEW_RESERVATION = 'MERCHANT_NEW_RESERVATION',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DRY_RUN = 'DRY_RUN',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetType: string | null;

  @Column('int', { nullable: true })
  targetId: number | null;

  @Column({ type: 'enum', enum: NotificationDeliveryStatus })
  status: NotificationDeliveryStatus;

  @Column('simple-json', { nullable: true })
  payload: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  error: Record<string, unknown> | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
