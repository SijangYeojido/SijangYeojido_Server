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
import { Market } from './market.entity';

export class MapPoint {
  x: number;
  y: number;
}

@Entity('market_zones')
export class MarketZone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @Column('simple-json', { nullable: true })
  boundary: MapPoint[];

  @ManyToOne(() => Market, (market) => market.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @OneToMany(() => Store, (store) => store.zone)
  stores: Store[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
