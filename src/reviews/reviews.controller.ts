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
import { CreateReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('stores/:storeId')
  @ApiOperation({ summary: 'List reviews for a store' })
  findByStore(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.reviewsService.findByStore(storeId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a store review' })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(request.user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete current user review' })
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.reviewsService.remove(request.user.id, id);
    return { deleted: true };
  }
}
