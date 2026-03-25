import { Controller, Get, Query } from '@nestjs/common';
import { MapService } from './map.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Map')
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('markets/nearby')
  @ApiOperation({ summary: 'Find nearby markets within radius (km)' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  async getNearbyMarkets(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.mapService.findNearbyMarkets(parseFloat(lat), parseFloat(lng), radius ? parseFloat(radius) : 5);
  }

  @Get('stores/search')
  @ApiOperation({ summary: 'Search stores by market, category, or keyword' })
  @ApiQuery({ name: 'marketId', type: Number, required: false })
  @ApiQuery({ name: 'category', type: String, required: false })
  @ApiQuery({ name: 'keyword', type: String, required: false })
  async searchStores(
    @Query('marketId') marketId?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.mapService.searchStores(
      marketId ? parseInt(marketId, 10) : undefined,
      category,
      keyword,
    );
  }
}
