import {
  Body,
  Controller,
  Get,
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
import { CreateActionLogDto } from './dto/action-log.dto';
import { SystemService } from './system.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('System')
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'Service health check' })
  health() {
    return this.systemService.health();
  }

  @Post('system/logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a user action log (SY-003)' })
  createUserActionLog(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateActionLogDto,
  ) {
    return this.systemService.createUserActionLog(request.user.id, dto);
  }

  @Get('admin/system/logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin lists API and user action logs (SY-003)' })
  findLogs(@Query('limit') limit?: string) {
    return this.systemService.findLogs(limit ? parseInt(limit, 10) : 100);
  }
}
