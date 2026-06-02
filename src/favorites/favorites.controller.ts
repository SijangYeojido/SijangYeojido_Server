import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { FavoriteMarketDto, FavoriteStoreDto } from './dto/favorite.dto';
import { FavoritesService } from './favorites.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List current user favorites' })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.favoritesService.findAll(request.user.id);
  }

  @Post('markets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Favorite a market' })
  addMarket(
    @Req() request: AuthenticatedRequest,
    @Body() dto: FavoriteMarketDto,
  ) {
    return this.favoritesService.addMarket(request.user.id, dto.marketId);
  }

  @Delete('markets/:marketId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove market favorite' })
  async removeMarket(
    @Req() request: AuthenticatedRequest,
    @Param('marketId', ParseIntPipe) marketId: number,
  ) {
    await this.favoritesService.removeMarket(request.user.id, marketId);
    return { deleted: true };
  }

  @Post('stores')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Favorite a store' })
  addStore(@Req() request: AuthenticatedRequest, @Body() dto: FavoriteStoreDto) {
    return this.favoritesService.addStore(request.user.id, dto.storeId);
  }

  @Delete('stores/:storeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove store favorite' })
  async removeStore(
    @Req() request: AuthenticatedRequest,
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    await this.favoritesService.removeStore(request.user.id, storeId);
    return { deleted: true };
  }
}
