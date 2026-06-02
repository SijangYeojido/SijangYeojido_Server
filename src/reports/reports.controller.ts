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
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './dto/report.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Create store info, price, location, or fake-store report (RE-001~004)',
  })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    return this.reportsService.create(request.user.id, dto);
  }

  @Get('/admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin lists reports by status' })
  findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Patch('/admin/:id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin resolves or rejects a report' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateStatus(id, dto);
  }
}
