import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { AnalyticsOverviewQueryDto, RebuildAnalyticsDto } from './dto/analytics.dto';
import { AnalyticsService } from './analytics.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin KPI overview by day and funnel' })
  adminOverview(@Query() query: AnalyticsOverviewQueryDto) {
    return this.analyticsService.adminOverview(query);
  }

  @Post('admin/analytics/rebuild')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rebuild admin KPI daily snapshots' })
  rebuild(@Body() dto: RebuildAnalyticsDto) {
    return this.analyticsService.rebuildAdmin(dto);
  }

  @Get('seller/analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant KPI overview for owned stores' })
  sellerOverview(
    @Req() request: AuthenticatedRequest,
    @Query() query: AnalyticsOverviewQueryDto,
  ) {
    return this.analyticsService.sellerOverview(request.user.id, query);
  }
}
