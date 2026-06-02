import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { OAuthProvider, User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';

type KakaoUserResponse = {
  id?: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
  error_description?: string;
};

type NaverTokenInfo = {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateKakaoUser(
    kakaoId: string,
    name: string,
    profileImage?: string,
  ): Promise<User> {
    const result = await this.usersService.upsertOAuthUser({
      provider: OAuthProvider.KAKAO,
      providerId: kakaoId,
      name,
      profileImage,
    });
    return result.user;
  }

  async devLogin(role: Role) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new UnauthorizedException('Development login is disabled');
    }

    if (![Role.USER, Role.MERCHANT, Role.ADMIN].includes(role)) {
      throw new BadRequestException('Unsupported dev login role');
    }

    const user = await this.usersService.upsertDevUser(role);
    return this.createAuthResponse(user);
  }

  async loginWithEmail(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      !user?.passwordHash ||
      !this.verifyPassword(password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(user);
  }

  async registerWithEmail(input: {
    email: string;
    password: string;
    name: string;
    role?: Role;
  }) {
    const password = input.password.trim();
    const name = input.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.usersService.createEmailUser({
      email: input.email,
      passwordHash: this.hashPassword(password),
      name,
      role: input.role,
    });
    return this.createAuthResponse(user);
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  login(user: Pick<User, 'id' | 'role'>) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async loginWithKakaoToken(token: string, requestedRole?: Role) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Kakao token');
    }

    const profile = (await response.json()) as KakaoUserResponse;
    if (!profile.id) {
      throw new UnauthorizedException('Kakao profile is missing an id');
    }

    const result = await this.usersService.upsertOAuthUser({
      provider: OAuthProvider.KAKAO,
      providerId: String(profile.id),
      email: profile.kakao_account?.email,
      name:
        profile.kakao_account?.profile?.nickname ??
        profile.properties?.nickname ??
        '카카오 사용자',
      profileImage:
        profile.kakao_account?.profile?.profile_image_url ??
        profile.properties?.profile_image,
      requestedRole,
    });

    return this.createAuthResponse(result.user, result.isNewUser);
  }

  async loginWithGoogleToken(token: string, requestedRole?: Role) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const profile = (await response.json()) as GoogleTokenInfo;
    if (!profile.sub || profile.error_description) {
      throw new UnauthorizedException('Google profile is missing an id');
    }

    const allowedAudiences = [
      this.configService.get<string>('GOOGLE_SERVER_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
    ].filter(Boolean);

    if (
      allowedAudiences.length > 0 &&
      (!profile.aud || !allowedAudiences.includes(profile.aud))
    ) {
      throw new UnauthorizedException('Google token audience is not allowed');
    }

    const result = await this.usersService.upsertOAuthUser({
      provider: OAuthProvider.GOOGLE,
      providerId: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email ?? 'Google 사용자',
      profileImage: profile.picture,
      requestedRole,
    });

    return this.createAuthResponse(result.user, result.isNewUser);
  }

  async loginWithNaverToken(token: string, requestedRole?: Role) {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Naver token');
    }

    const profile = (await response.json()) as NaverTokenInfo;
    if (profile.resultcode !== '00' || !profile.response?.id) {
      throw new UnauthorizedException('Naver profile is missing an id');
    }

    const result = await this.usersService.upsertOAuthUser({
      provider: OAuthProvider.NAVER,
      providerId: profile.response.id,
      email: profile.response.email,
      name:
        profile.response.name ?? profile.response.nickname ?? '네이버 사용자',
      profileImage: profile.response.profile_image,
      requestedRole,
    });

    return this.createAuthResponse(result.user, result.isNewUser);
  }

  createAuthResponse(user: User, isNewUser = false) {
    return {
      accessToken: this.login(user).access_token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        profileImage: user.profileImage,
        needsProfileSetup: isNewUser || this.needsProfileSetup(user),
      },
    };
  }

  private needsProfileSetup(user: User) {
    return [
      '카카오 사용자',
      'Google 사용자',
      '네이버 사용자',
      '사용자',
      '시장여지도 사용자',
    ].includes(user.name);
  }
}
