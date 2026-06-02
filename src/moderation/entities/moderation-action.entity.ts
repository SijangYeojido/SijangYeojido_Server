import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ModerationCase } from './moderation-case.entity';

export enum ModerationActionType {
  TEMP_HIDE_TARGET = 'TEMP_HIDE_TARGET',
  RESTORE_TARGET = 'RESTORE_TARGET',
  FORCE_END_DEAL = 'FORCE_END_DEAL',
  REFUND_RESERVATION = 'REFUND_RESERVATION',
  WARN_MERCHANT = 'WARN_MERCHANT',
  SUSPEND_STORE = 'SUSPEND_STORE',
  BLOCK_MERCHANT_DEALS = 'BLOCK_MERCHANT_DEALS',
  RESOLVE_CASE = 'RESOLVE_CASE',
  REJECT_CASE = 'REJECT_CASE',
  ADD_NOTE = 'ADD_NOTE',
}

@Entity('moderation_actions')
export class ModerationAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ModerationActionType })
  type: ModerationActionType;

  @Column('text', { nullable: true })
  note: string | null;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, unknown> | null;

  @ManyToOne(() => ModerationCase, (moderationCase) => moderationCase.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'caseId' })
  case: ModerationCase;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
