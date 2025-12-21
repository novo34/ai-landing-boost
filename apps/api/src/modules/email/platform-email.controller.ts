import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailDeliveryService } from './email-delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../common/guards/platform.guard';
import { PlatformRoles } from '../../common/decorators/platform-roles.decorator';
import { SmtpSettingsDto } from './dto/smtp-settings.dto';
import { SendTestEmailDto } from './dto/send-email.dto';

@Controller('platform/settings/email')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformEmailController {
  constructor(private emailDeliveryService: EmailDeliveryService) {}

  @Get()
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
  async getSettings() {
    const settings = await this.emailDeliveryService.getPlatformSmtpSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Put()
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  async updateSettings(@Req() req: any, @Body() dto: SmtpSettingsDto) {
    const userId = req.user.userId;
    const settings = await this.emailDeliveryService.savePlatformSmtpSettings(dto, userId);
    return {
      success: true,
      data: settings,
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const result = await this.emailDeliveryService.sendTestEmail(undefined, dto.to, dto.subject);
    return {
      success: true,
      data: result,
    };
  }

  @Get('logs')
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const result = await this.emailDeliveryService.getEmailLogs(undefined, parseInt(page), parseInt(limit), status);
    return {
      success: true,
      ...result,
    };
  }
}


