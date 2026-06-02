import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import {
  AssignModerationCaseDto,
  CreateModerationActionDto,
  ModerationCaseQueryDto,
} from './dto/moderation.dto';
import { ModerationService } from './moderation.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('admin/moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('cases')
  @ApiOperation({ summary: 'List moderation cases for trust center' })
  findCases(@Query() query: ModerationCaseQueryDto) {
    return this.moderationService.findCases(query);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get a moderation case with actions' })
  findCase(@Param('id', ParseIntPipe) id: number) {
    return this.moderationService.findCase(id);
  }

  @Patch('cases/:id/assign')
  @ApiOperation({ summary: 'Assign a moderation case' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignModerationCaseDto,
  ) {
    return this.moderationService.assign(id, dto.assigneeId);
  }

  @Post('cases/:id/actions')
  @ApiOperation({ summary: 'Run a moderation action and audit it' })
  createAction(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateModerationActionDto,
  ) {
    return this.moderationService.createAction(request.user.id, id, dto);
  }
}
