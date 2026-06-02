import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';

type KakaoProfileJson = {
  properties?: {
    profile_image?: string;
  };
};

type VerifyDone = (error: Error | null, user?: User) => void;

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID:
        configService.get<string>('KAKAO_CLIENT_ID') || 'dummy-client-id',
      callbackURL:
        configService.get<string>('KAKAO_CALLBACK_URL') ||
        `${configService.get<string>('PICKTOR_API_URL') || 'http://localhost:4000'}/auth/kakao/callback`,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyDone,
  ) {
    const kakaoId = profile.id.toString();
    const name = profile.displayName || profile.username || 'User';
    const profileJson = profile._json as KakaoProfileJson;
    const profileImage = profileJson.properties?.profile_image || '';

    const user = await this.authService.validateKakaoUser(
      kakaoId,
      name,
      profileImage,
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    done(null, user);
  }
}
