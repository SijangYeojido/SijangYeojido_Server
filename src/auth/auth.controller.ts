import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { User } from '../users/entities/user.entity';
import { DevLoginDto } from './dto/dev-login.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { EmailRegisterDto } from './dto/email-register.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';

type OAuthRequest = Request & { user: Pick<User, 'id' | 'role'> };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth Login' })
  kakaoAuth() {
    // Guards handle redirection to Kakao login page
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth Callback' })
  kakaoAuthCallback(@Req() req: OAuthRequest, @Res() res: Response) {
    const { access_token } = this.authService.login(req.user);
    const tokenQuery = `token=${encodeURIComponent(access_token)}`;
    const redirectUrl =
      this.configService.get<string>('KAKAO_REDIRECT_URL')?.trim() ||
      `${
        this.configService.get<string>('PICKTOR_WEB_ORIGIN')?.trim() ||
        'http://localhost:3001'
      }/callback`;

    const separator = redirectUrl.includes('?') ? '&' : '?';
    return res.redirect(`${redirectUrl}${separator}${tokenQuery}`);
  }

  @Post('oauth/kakao')
  @ApiOperation({ summary: 'Exchange Kakao native access token for app JWT' })
  loginWithKakao(@Body() dto: OAuthLoginDto) {
    return this.authService.loginWithKakaoToken(dto.token, dto.requestedRole);
  }

  @Post('oauth/google')
  @ApiOperation({ summary: 'Exchange Google ID token for app JWT' })
  loginWithGoogle(@Body() dto: OAuthLoginDto) {
    return this.authService.loginWithGoogleToken(dto.token, dto.requestedRole);
  }

  @Post('oauth/naver')
  @ApiOperation({ summary: 'Exchange Naver access token for app JWT' })
  loginWithNaver(@Body() dto: OAuthLoginDto) {
    return this.authService.loginWithNaverToken(dto.token, dto.requestedRole);
  }

  @Post('login')
  @ApiOperation({ summary: 'Email/password JWT login' })
  loginWithEmail(@Body() dto: EmailLoginDto) {
    return this.authService.loginWithEmail(dto.email, dto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'Email/password JWT registration' })
  registerWithEmail(@Body() dto: EmailRegisterDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('dev-login')
  @ApiOperation({ summary: 'Development role login without OAuth' })
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.role);
  }
}
