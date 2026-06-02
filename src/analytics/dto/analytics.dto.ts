import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional } from 'class-validator';

export class AnalyticsOverviewQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d'], default: '7d' })
  @IsOptional()
  @IsIn(['7d', '30d'])
  range?: '7d' | '30d';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  storeId?: number;
}

export class RebuildAnalyticsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  marketId?: number;
}
