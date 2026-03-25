import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth Login' })
  async kakaoAuth(@Req() req) {
    // Guards handle redirection to Kakao login page
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth Callback' })
  async kakaoAuthCallback(@Req() req, @Res() res) {
    const { access_token } = await this.authService.login(req.user);
    // Redirect to frontend with token, or return JSON
    // Adjust frontend callback URL accordingly
    return res.redirect(`http://localhost:3000/callback?token=${access_token}`);
  }
}
