import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Role } from '../enums/role.enum';

export enum OAuthProvider {
  KAKAO = 'KAKAO',
  GOOGLE = 'GOOGLE',
  NAVER = 'NAVER',
  DEV = 'DEV',
}

@Index(['provider', 'providerId'], { unique: true })
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  kakaoId: string;

  @Column({ type: 'enum', enum: OAuthProvider, nullable: true })
  provider: OAuthProvider;

  @Column({ nullable: true })
  providerId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ type: 'timestamp', nullable: true })
  dealBlockedUntil: Date | null;

  @Column('text', { nullable: true })
  moderationMemo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
