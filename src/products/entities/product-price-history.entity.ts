import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from './product.entity';

@Entity('product_price_histories')
export class ProductPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  price: number;

  @Column({ nullable: true })
  note: string;

  @ManyToOne(() => Product, (product) => product.priceHistories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedById' })
  changedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
