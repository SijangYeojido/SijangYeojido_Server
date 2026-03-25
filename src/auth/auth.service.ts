import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateKakaoUser(kakaoId: string, name: string, profileImage?: string) {
    let user = await this.usersService.findByKakaoId(kakaoId);
    if (!user) {
      user = await this.usersService.createUser(kakaoId, name, profileImage);
    }
    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
