import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  RegisterDeviceTokenDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & { user: User };

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-tokens')
  @ApiOperation({
    summary: 'Register or refresh current user FCM device token',
  })
  registerDeviceToken(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(request.user.id, dto);
  }

  @Delete('device-tokens/:token')
  @ApiOperation({ summary: 'Deactivate current user FCM device token' })
  deactivateDeviceToken(
    @Req() request: AuthenticatedRequest,
    @Param('token') token: string,
  ) {
    return this.notificationsService.deactivateDeviceToken(
      request.user.id,
      token,
    );
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getPreferences(request.user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreferences(request.user.id, dto);
  }
}
