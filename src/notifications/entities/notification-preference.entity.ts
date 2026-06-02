import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  dealAlerts: boolean;

  @Column({ default: true })
  reservationAlerts: boolean;

  @Column({ default: true })
  merchantAlerts: boolean;

  @Column({ default: '22:00' })
  quietHoursStart: string;

  @Column({ default: '08:00' })
  quietHoursEnd: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
