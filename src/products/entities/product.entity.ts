import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { ProductPriceHistory } from './product-price-history.entity';

export enum ProductStockStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD_OUT = 'SOLD_OUT',
  HIDDEN = 'HIDDEN',
  DISCONTINUED = 'DISCONTINUED',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  unit: string;

  @Column('int', { default: 0 })
  currentPrice: number;

  @Column({
    type: 'enum',
    enum: ProductStockStatus,
    default: ProductStockStatus.AVAILABLE,
  })
  stockStatus: ProductStockStatus;

  @ManyToOne(() => Store, (store) => store.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @OneToMany(() => ProductPriceHistory, (history) => history.product)
  priceHistories: ProductPriceHistory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
