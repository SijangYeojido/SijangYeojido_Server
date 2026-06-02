import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Poi } from './poi.entity';
import { Store } from '../../stores/entities/store.entity';
import { MarketZone } from './market-zone.entity';

@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  region: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  operatingHours: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  mapImageUrl: string;

  @Column('int', { nullable: true })
  mapWidth: number;

  @Column('int', { nullable: true })
  mapHeight: number;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @OneToMany(() => Poi, (poi) => poi.market)
  pois: Poi[];

  @OneToMany(() => MarketZone, (zone) => zone.market)
  zones: MarketZone[];

  @OneToMany(() => Store, (store) => store.market)
  stores: Store[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}
