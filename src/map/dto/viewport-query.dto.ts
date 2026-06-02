import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class ViewportQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  minX: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  maxX: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  minY: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  maxY: number;
}
