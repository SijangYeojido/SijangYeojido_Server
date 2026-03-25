import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID') || 'dummy-client-id',
      callbackURL: configService.get<string>('KAKAO_CALLBACK_URL') || 'http://localhost:3000/auth/kakao/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const kakaoId = profile.id.toString();
    const name = profile.displayName || profile.username || 'User';
    const profileImage = profile._json?.properties?.profile_image || '';

    const user = await this.authService.validateKakaoUser(kakaoId, name, profileImage);
    
    if (!user) {
      throw new UnauthorizedException();
    }
    
    done(null, user);
  }
}
