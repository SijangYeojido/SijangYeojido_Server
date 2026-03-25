import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Poi } from './poi.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('markets')
export class Market {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column('float')
  latitude: number;

  @Column('float')
  longitude: number;

  @OneToMany(() => Poi, (poi) => poi.market)
  pois: Poi[];

  @OneToMany(() => Store, (store) => store.market)
  stores: Store[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
