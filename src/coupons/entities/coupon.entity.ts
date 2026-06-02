import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Market } from '../../markets/entities/market.entity';
import { User } from '../../users/entities/user.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  benefit: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Market, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('coupon_claims')
export class CouponClaim {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'couponId' })
  coupon: Coupon;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
