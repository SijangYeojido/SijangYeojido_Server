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
import { CreateSearchHistoryDto } from './dto/search-history.dto';
import { SearchHistoryService } from './search-history.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Search History')
@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List current user search history' })
  findAll(@Req() request: AuthenticatedRequest) {
    return this.searchHistoryService.findAll(request.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a search keyword' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSearchHistoryDto,
  ) {
    return this.searchHistoryService.create(request.user.id, dto.keyword);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete one search history item' })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.searchHistoryService.remove(request.user.id, id);
    return { deleted: true };
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Clear current user search history' })
  async clear(@Req() request: AuthenticatedRequest) {
    await this.searchHistoryService.clear(request.user.id);
    return { deleted: true };
  }
}
