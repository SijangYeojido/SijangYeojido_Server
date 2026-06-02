import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

@Index(['token'], { unique: true })
@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  token: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.UNKNOWN,
  })
  platform: DevicePlatform;

  @Column({ type: 'varchar', nullable: true })
  appVersion: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
