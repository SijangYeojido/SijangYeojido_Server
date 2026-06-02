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
import { Report, ReportTargetType } from '../../reports/entities/report.entity';
import { User } from '../../users/entities/user.entity';
import { ModerationAction } from './moderation-action.entity';

export enum ModerationCaseStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  ACTIONED = 'ACTIONED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ModerationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('moderation_cases')
export class ModerationCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ReportTargetType })
  targetType: ReportTargetType;

  @Column('int')
  targetId: number;

  @Column({
    type: 'enum',
    enum: ModerationCaseStatus,
    default: ModerationCaseStatus.OPEN,
  })
  status: ModerationCaseStatus;

  @Column({
    type: 'enum',
    enum: ModerationSeverity,
    default: ModerationSeverity.MEDIUM,
  })
  severity: ModerationSeverity;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'timestamp', nullable: true })
  dueAt: Date | null;

  @ManyToOne(() => Report, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primaryReportId' })
  primaryReport: Report | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User | null;

  @OneToMany(() => ModerationAction, (action) => action.case)
  actions: ModerationAction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
