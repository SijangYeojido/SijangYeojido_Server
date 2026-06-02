import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Store } from '../../stores/entities/store.entity';

export enum DealStatus {
  LIVE = 'LIVE',
  SOLD_OUT = 'SOLD_OUT',
  ENDED = 'ENDED',
  EXPIRED = 'EXPIRED',
}

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column('int')
  dealPrice: number;

  @Column('int', { nullable: true })
  originalPrice: number;

  @Column('int', { default: 0 })
  availableQuantity: number;

  @Column({ type: 'enum', enum: DealStatus, default: DealStatus.LIVE })
  status: DealStatus;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
