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
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/deal.dto';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get('live')
  @ApiOperation({ summary: 'List live flash deals' })
  findLive(
    @Query('marketId') marketId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.dealsService.findLive(
      marketId ? Number(marketId) : undefined,
      storeId ? Number(storeId) : undefined,
    );
  }

  @Get('seller')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant lists own deals' })
  findMine(@Req() request: AuthenticatedRequest) {
    return this.dealsService.findMine(request.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant creates a live deal' })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateDealDto) {
    return this.dealsService.create(request.user.id, dto);
  }

  @Patch(':id/end')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT)
  @ApiOperation({ summary: 'Merchant ends a deal' })
  end(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dealsService.end(request.user.id, id);
  }
}
