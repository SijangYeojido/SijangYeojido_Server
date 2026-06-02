import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';
import {
  CreateMarketDto,
  CreateMarketZoneDto,
  MarketQueryDto,
  UpdateMarketDto,
  UpdateMarketZoneDto,
} from './dto/market.dto';
import { MarketsService } from './markets.service';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: 'List registered markets (MK-001)' })
  findAll(@Query() query: MarketQueryDto) {
    return this.marketsService.findAll(query);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search markets by name, address, or region (MK-002)',
  })
  search(@Query() query: MarketQueryDto) {
    return this.marketsService.findAll(query);
  }

  @Get(':id/map')
  @ApiOperation({
    summary:
      'Get market internal map, zones, POIs, and store pins (MK-004~008)',
  })
  getInternalMap(@Param('id', ParseIntPipe) id: number) {
    return this.marketsService.getInternalMap(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get market details (MK-003)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.marketsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin creates a market (AD-001)' })
  create(@Body() dto: CreateMarketDto) {
    return this.marketsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin updates a market (AD-002)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMarketDto) {
    return this.marketsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin deletes a market (AD-003)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.marketsService.remove(id);
    return { deleted: true };
  }

  @Post(':marketId/zones')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin creates a market map zone (MK-005, SY-001)' })
  createZone(
    @Param('marketId', ParseIntPipe) marketId: number,
    @Body() dto: CreateMarketZoneDto,
  ) {
    return this.marketsService.createZone(marketId, dto);
  }

  @Patch(':marketId/zones/:zoneId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin updates a market map zone (MK-005, SY-001)' })
  updateZone(
    @Param('marketId', ParseIntPipe) marketId: number,
    @Param('zoneId', ParseIntPipe) zoneId: number,
    @Body() dto: UpdateMarketZoneDto,
  ) {
    return this.marketsService.updateZone(marketId, zoneId, dto);
  }

  @Delete(':marketId/zones/:zoneId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin deletes a market map zone (MK-005, SY-001)' })
  async removeZone(
    @Param('marketId', ParseIntPipe) marketId: number,
    @Param('zoneId', ParseIntPipe) zoneId: number,
  ) {
    await this.marketsService.removeZone(marketId, zoneId);
    return { deleted: true };
  }
}
