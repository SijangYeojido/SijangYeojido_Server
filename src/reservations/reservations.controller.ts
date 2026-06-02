import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import {
  CompleteReservationDto,
  CreateReservationDto,
} from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Reservations')
@Controller('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List current user or merchant reservations' })
  findMine(@Req() request: AuthenticatedRequest) {
    return this.reservationsService.findMine(request.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a pickup reservation awaiting payment' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(request.user.id, dto);
  }

  @Post(':id/payments/mock-confirm')
  @ApiOperation({
    summary: 'Confirm mock reservation payment and start 15-minute TTL',
  })
  confirmMockPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reservationsService.confirmMockPayment(request.user.id, id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Merchant completes pickup reservation' })
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteReservationDto,
  ) {
    return this.reservationsService.complete(request.user, id, dto.pickupCode);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Customer cancels pickup reservation' })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reservationsService.cancel(request.user.id, id);
  }
}
