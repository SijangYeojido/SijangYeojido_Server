import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Socket } from 'net';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateActionLogDto } from './dto/action-log.dto';
import { ActionLog, ActionLogType } from './entities/action-log.entity';

export interface ApiLogInput {
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(ActionLog)
    private readonly actionLogsRepository: Repository<ActionLog>,
    private readonly dataSource: DataSource,
  ) {}

  async recordApiLog(input: ApiLogInput): Promise<ActionLog> {
    return this.actionLogsRepository.save(
      this.actionLogsRepository.create({
        type: input.statusCode >= 500 ? ActionLogType.ERROR : ActionLogType.API,
        method: input.method,
        path: input.path,
        statusCode: input.statusCode,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: input.metadata,
        user: input.userId ? ({ id: input.userId } as User) : undefined,
      }),
    );
  }

  async createUserActionLog(
    userId: number,
    dto: CreateActionLogDto,
  ): Promise<ActionLog> {
    return this.actionLogsRepository.save(
      this.actionLogsRepository.create({
        type: ActionLogType.USER_ACTION,
        action: dto.action,
        metadata: dto.metadata,
        user: { id: userId } as User,
      }),
    );
  }

  async findLogs(limit = 100): Promise<ActionLog[]> {
    return this.actionLogsRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  async health() {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();
    const ok = database === 'ok' && redis !== 'error';
    return {
      status: ok ? 'ok' : 'degraded',
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private checkRedis(): Promise<'ok' | 'not_configured' | 'error'> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const parsed = new URL(url);
    return new Promise((resolve) => {
      const socket = new Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(process.env.REDIS_URL ? 'error' : 'not_configured');
      }, 500);
      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve('ok');
      });
      socket.once('error', () => {
        clearTimeout(timeout);
        resolve(process.env.REDIS_URL ? 'error' : 'not_configured');
      });
      socket.connect(Number(parsed.port || 6379), parsed.hostname);
    });
  }
}
