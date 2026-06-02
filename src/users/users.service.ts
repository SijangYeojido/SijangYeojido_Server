import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthProvider, User } from './entities/user.entity';
import { Role } from './enums/role.enum';

export interface OAuthUserInput {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  name: string;
  profileImage?: string;
  requestedRole?: Role;
}

export interface OAuthUserResult {
  user: User;
  isNewUser: boolean;
}

export interface EmailUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByKakaoId(kakaoId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { kakaoId } });
  }

  async findByOAuthIdentity(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { provider, providerId },
    });
  }

  async createUser(
    kakaoId: string,
    name: string,
    profileImage?: string,
  ): Promise<User> {
    const user = this.usersRepository.create({
      kakaoId,
      provider: OAuthProvider.KAKAO,
      providerId: kakaoId,
      name,
      profileImage,
    });
    return this.usersRepository.save(user);
  }

  async upsertOAuthUser(input: OAuthUserInput): Promise<OAuthUserResult> {
    let user = await this.findByOAuthIdentity(input.provider, input.providerId);

    if (!user && input.provider === OAuthProvider.KAKAO) {
      user = await this.findByKakaoId(input.providerId);
    }

    const isNewUser = !user;

    if (!user) {
      user = this.usersRepository.create({
        provider: input.provider,
        providerId: input.providerId,
        kakaoId:
          input.provider === OAuthProvider.KAKAO ? input.providerId : undefined,
        email: input.email,
        name: input.name,
        profileImage: input.profileImage,
        role: this.getAllowedSelfSelectedRole(input.requestedRole),
      });
    } else {
      user.provider = input.provider;
      user.providerId = input.providerId;
      user.email = input.email ?? user.email;
      user.name = input.name;
      user.profileImage = input.profileImage ?? user.profileImage;
      if (user.role === Role.USER || user.role === Role.MERCHANT) {
        user.role = this.getAllowedSelfSelectedRole(
          input.requestedRole ?? user.role,
        );
      }
    }

    return {
      user: await this.usersRepository.save(user),
      isNewUser,
    };
  }

  async upsertDevUser(role: Role): Promise<User> {
    const allowedRole =
      role === Role.ADMIN || role === Role.MERCHANT ? role : Role.USER;
    const providerId = `dev-${allowedRole.toLowerCase()}`;
    let user = await this.findByOAuthIdentity(OAuthProvider.DEV, providerId);

    const values = {
      provider: OAuthProvider.DEV,
      providerId,
      email: `${providerId}@sijang.local`,
      name:
        allowedRole === Role.ADMIN
          ? '개발 운영자'
          : allowedRole === Role.MERCHANT
            ? '개발 상인'
            : '개발 사용자',
      role: allowedRole,
    };

    if (!user) {
      user = this.usersRepository.create(values);
    } else {
      Object.assign(user, values);
    }

    return this.usersRepository.save(user);
  }

  async createEmailUser(input: EmailUserInput): Promise<User> {
    const user = this.usersRepository.create({
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name.trim(),
      role: this.getAllowedSelfSelectedRole(input.role),
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async updateProfile(
    userId: number,
    input: { name?: string; profileImage?: string },
  ): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    if (input.name !== undefined) {
      user.name = input.name.trim();
    }
    if (input.profileImage !== undefined) {
      user.profileImage = input.profileImage.trim();
    }

    return this.usersRepository.save(user);
  }

  private getAllowedSelfSelectedRole(role?: Role): Role {
    return role === Role.MERCHANT ? Role.MERCHANT : Role.USER;
  }
}
