import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Market } from '../../markets/entities/market.entity';
import { User } from '../../users/entities/user.entity';

export enum BusinessStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  BREAK = 'BREAK',
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

  @Column({
    type: 'enum',
    enum: BusinessStatus,
    default: BusinessStatus.CLOSED,
  })
  businessStatus: BusinessStatus;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @ManyToOne(() => Market, (market) => market.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
