import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  ModerationActionType,
} from '../entities/moderation-action.entity';
import {
  ModerationCaseStatus,
  ModerationSeverity,
} from '../entities/moderation-case.entity';

export class ModerationCaseQueryDto {
  @ApiPropertyOptional({ enum: ModerationCaseStatus })
  @IsOptional()
  @IsEnum(ModerationCaseStatus)
  status?: ModerationCaseStatus;

  @ApiPropertyOptional({ enum: ModerationSeverity })
  @IsOptional()
  @IsEnum(ModerationSeverity)
  severity?: ModerationSeverity;
}

export class AssignModerationCaseDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  assigneeId: number;
}

export class CreateModerationActionDto {
  @ApiProperty({ enum: ModerationActionType })
  @IsEnum(ModerationActionType)
  type: ModerationActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Optional related target id override' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetId?: number;

  @ApiPropertyOptional({ description: 'Block duration in hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  durationHours?: number;
}
