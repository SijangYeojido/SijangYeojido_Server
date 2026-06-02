import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ReportStatus,
  ReportTargetType,
  ReportType,
} from '../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType: ReportTargetType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  targetId: number;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReportQueryDto {
  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class UpdateReportStatusDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminMemo?: string;
}
