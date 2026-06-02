import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Market } from '../../markets/entities/market.entity';
import { MarketZone } from '../../markets/entities/market-zone.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { StorePhoto } from './store-photo.entity';

export enum BusinessStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  BREAK = 'BREAK',
}

export enum StoreApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum StoreModerationStatus {
  NORMAL = 'NORMAL',
  HIDDEN = 'HIDDEN',
  SUSPENDED = 'SUSPENDED',
}

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  openingTime: string;

  @Column({ nullable: true })
  closingTime: string;

  @Column('simple-json', { nullable: true })
  regularHolidays: string[];

  @Column('simple-json', { nullable: true })
  temporaryHolidays: string[];

  @Column('simple-json', { nullable: true })
  paymentMethods: string[];

  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.CLOSED,
  })
  businessStatus: BusinessStatus;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  addressDetail: string;

  @Column({ nullable: true })
  building: string;

  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  unitNo: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column('float', { nullable: true })
  mapX: number;

  @Column('float', { nullable: true })
  mapY: number;

  @Column({
    type: 'enum',
    enum: StoreApprovalStatus,
    default: StoreApprovalStatus.PENDING,
  })
  approvalStatus: StoreApprovalStatus;

  @Column({
    type: 'enum',
    enum: StoreModerationStatus,
    default: StoreModerationStatus.NORMAL,
  })
  moderationStatus: StoreModerationStatus;

  @Column('text', { nullable: true })
  moderationReason: string | null;

  @ManyToOne(() => Market, (market) => market.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @ManyToOne(() => MarketZone, (zone) => zone.stores, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'zoneId' })
  zone: MarketZone;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: User;

  @OneToMany(() => StorePhoto, (photo) => photo.store)
  photos: StorePhoto[];

  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
