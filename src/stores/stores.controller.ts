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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/entities/user.entity';
import {
  AdminStoreQueryDto,
  ApproveStoreDto,
  CreateStoreDto,
  CreateStorePhotoDto,
  StoreQueryDto,
  UpdateStoreDto,
} from './dto/store.dto';
import { StoresService } from './stores.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Stores')
@Controller()
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('markets/:marketId/stores')
  @ApiOperation({ summary: 'List stores in a market (ST-001)' })
  findByMarket(
    @Param('marketId', ParseIntPipe) marketId: number,
    @Query() query: StoreQueryDto,
  ) {
    return this.storesService.findByMarket(marketId, query);
  }

  @Get('stores/search')
  @ApiOperation({
    summary: 'Search stores by name, category, or product keyword (ST-002)',
  })
  search(@Query() query: StoreQueryDto) {
    return this.storesService.search(query);
  }

  @Get('stores/:id/location')
  @ApiOperation({ summary: 'Get store location inside market (ST-004)' })
  findLocation(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.findLocation(id);
  }

  @Get('stores/:id')
  @ApiOperation({
    summary:
      'Get store details including name, category, hours, holidays, payments, and photos (ST-003~010)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.findOne(id);
  }

  @Get('seller/stores')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Merchant lists owned stores' })
  findOwnedStores(@Req() request: AuthenticatedRequest) {
    return this.storesService.findOwnedStores(request.user.id);
  }

  @Post('seller/stores')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Merchant requests new store registration (SE-001)',
  })
  createMerchantStore(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateStoreDto,
  ) {
    return this.storesService.createMerchantStore(request.user.id, dto);
  }

  @Patch('seller/stores/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Merchant updates store information (SE-002)' })
  updateMerchantStore(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateMerchantStore(request.user.id, id, dto);
  }

  @Post('seller/stores/:id/photos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Merchant uploads store photo metadata (SE-003)' })
  addPhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateStorePhotoDto,
  ) {
    return this.storesService.addPhoto(request.user.id, id, dto);
  }

  @Delete('seller/stores/:id/photos/:photoId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MERCHANT, Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Merchant removes store photo metadata (SE-003)' })
  async removePhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    await this.storesService.removePhoto(request.user.id, id, photoId);
    return { deleted: true };
  }

  @Get('admin/stores')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin lists stores including pending requests' })
  findForAdmin(@Query() query: AdminStoreQueryDto) {
    return this.storesService.findForAdmin(query);
  }

  @Patch('admin/stores/:id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({
    summary: 'Admin approves or rejects merchant store request (AD-004)',
  })
  approveStore(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveStoreDto,
  ) {
    return this.storesService.approveStore(id, dto);
  }

  @Patch('admin/stores/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin updates store information (AD-005)' })
  adminUpdateStore(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.adminUpdateStore(id, dto);
  }

  @Delete('admin/stores/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Admin deletes a store (AD-006)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.storesService.remove(id);
    return { deleted: true };
  }
}
