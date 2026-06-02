import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../users/enums/role.enum';

export class OAuthLoginDto {
  @ApiProperty({ description: 'Provider access token or ID token' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ enum: [Role.USER, Role.MERCHANT] })
  @IsOptional()
  @IsEnum(Role)
  requestedRole?: Role;
}
