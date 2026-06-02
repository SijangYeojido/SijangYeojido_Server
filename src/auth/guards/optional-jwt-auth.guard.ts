import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser) {
    if (err || !user) return null;
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
