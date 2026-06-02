import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { User } from '../users/entities/user.entity';
import { SystemService } from './system.service';

type LoggedRequest = Request & { user?: User };
type ErrorLike = { status?: number; message?: string };

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  constructor(private readonly systemService: SystemService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<LoggedRequest>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.writeLog(request, response.statusCode, startedAt);
        },
        error: (error: ErrorLike) => {
          this.writeLog(
            request,
            error.status ?? response.statusCode ?? 500,
            startedAt,
            error.message,
          );
        },
      }),
    );
  }

  private writeLog(
    request: LoggedRequest,
    statusCode: number,
    startedAt: number,
    errorMessage?: string,
  ): void {
    void this.systemService
      .recordApiLog({
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        ip: request.ip,
        userAgent: request.get('user-agent'),
        userId: request.user?.id,
        metadata: {
          durationMs: Date.now() - startedAt,
          errorMessage,
        },
      })
      .catch(() => undefined);
  }
}
