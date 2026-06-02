import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') ||
          configService.get<string>('JWT_ACCESS_SECRET');
        if (!secret && configService.get<string>('NODE_ENV') === 'production') {
          throw new Error('JWT_SECRET or JWT_ACCESS_SECRET is required');
        }
        return {
          secret: secret || 'secretKey',
          signOptions: { expiresIn: '12h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, KakaoStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
