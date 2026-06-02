import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ActionLogType {
  API = 'API',
  USER_ACTION = 'USER_ACTION',
  ERROR = 'ERROR',
}

@Entity('action_logs')
export class ActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ActionLogType })
  type: ActionLogType;

  @Column({ nullable: true })
  action: string;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  path: string;

  @Column('int', { nullable: true })
  statusCode: number;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown>;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
