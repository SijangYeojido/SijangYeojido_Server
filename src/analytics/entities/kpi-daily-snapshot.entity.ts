import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum KpiRoleScope {
  ADMIN = 'ADMIN',
  MERCHANT = 'MERCHANT',
}

@Index(['date', 'roleScope', 'marketKey', 'storeKey'], { unique: true })
@Entity('kpi_daily_snapshots')
export class KpiDailySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string;

  @Column({ type: 'enum', enum: KpiRoleScope })
  roleScope: KpiRoleScope;

  @Column({ default: 'all' })
  marketKey: string;

  @Column({ default: 'all' })
  storeKey: string;

  @Column('int', { nullable: true })
  marketId: number | null;

  @Column('int', { nullable: true })
  storeId: number | null;

  @Column('int', { nullable: true })
  merchantId: number | null;

  @Column('int', { default: 0 })
  marketViews: number;

  @Column('int', { default: 0 })
  mapViews: number;

  @Column('int', { default: 0 })
  mapRenders: number;

  @Column('int', { default: 0 })
  searches: number;

  @Column('int', { default: 0 })
  filters: number;

  @Column('int', { default: 0 })
  storeOpens: number;

  @Column('int', { default: 0 })
  dealViews: number;

  @Column('int', { default: 0 })
  reservationStarts: number;

  @Column('int', { default: 0 })
  reservationsCreated: number;

  @Column('int', { default: 0 })
  paymentSuccesses: number;

  @Column('int', { default: 0 })
  pickupCompletions: number;

  @Column('int', { default: 0 })
  ttlExpirations: number;

  @Column('int', { default: 0 })
  cancellations: number;

  @Column('int', { default: 0 })
  refunds: number;

  @Column('int', { default: 0 })
  reportsCreated: number;

  @Column('int', { default: 0 })
  moderationActions: number;

  @Column('int', { default: 0 })
  slaOverdueCases: number;

  @Column('int', { default: 0 })
  notificationsSent: number;

  @Column('int', { default: 0 })
  notificationsFailed: number;

  @Column('int', { default: 0 })
  dealsCreated: number;

  @Column('int', { default: 0 })
  activeDeals: number;

  @Column('float', { default: 0 })
  reservationStartRate: number;

  @Column('float', { default: 0 })
  paymentSuccessRate: number;

  @Column('float', { default: 0 })
  pickupCompletionRate: number;

  @Column()
  generatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
