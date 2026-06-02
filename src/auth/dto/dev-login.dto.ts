import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../users/enums/role.enum';

export class DevLoginDto {
  @ApiProperty({ enum: [Role.USER, Role.MERCHANT, Role.ADMIN] })
  @IsEnum(Role)
  role: Role;
}
