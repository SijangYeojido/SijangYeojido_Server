import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Market } from './market.entity';

export enum PoiType {
  BATHROOM = 'BATHROOM',
  PARKING = 'PARKING',
  ATM = 'ATM',
  ENTRANCE = 'ENTRANCE',
}

@Entity('pois')
export class Poi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: PoiType,
  })
  type: PoiType;

  @Column({ nullable: true })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @Column('float', { nullable: true })
  mapX: number;

  @Column('float', { nullable: true })
  mapY: number;

  @ManyToOne(() => Market, (market) => market.pois, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;
}
