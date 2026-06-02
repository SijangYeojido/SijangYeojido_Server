import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Display name',
    minLength: 2,
    maxLength: 24,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  name?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
