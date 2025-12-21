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
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { SmtpSettingsDto } from './dto/smtp-settings.dto';
import { SendTestEmailDto } from './dto/send-email.dto';

@Controller('settings/email')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class EmailDeliveryController {
  constructor(private emailDeliveryService: EmailDeliveryService) {}

  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getSettings(@CurrentTenant() tenant: { id: string; role: string }) {
    const settings = await this.emailDeliveryService.getTenantSmtpSettings(tenant.id);
    return {
      success: true,
      data: settings,
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async sendTestEmail(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: SendTestEmailDto,
  ) {
    const result = await this.emailDeliveryService.sendTestEmail(tenant.id, dto.to, dto.subject);
    return {
      success: true,
      data: result,
    };
  }

  @Get('logs')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getLogs(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const result = await this.emailDeliveryService.getEmailLogs(
      tenant.id,
      parseInt(page),
      parseInt(limit),
      status,
    );
    return {
      success: true,
      ...result,
    };
  }

  @Put()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateSettings(
    @CurrentTenant() tenant: { id: string; role: string },
    @Req() req: any,
    @Body() dto: SmtpSettingsDto,
  ) {
    const userId = req.user.userId;
    const settings = await this.emailDeliveryService.saveTenantSmtpSettings(tenant.id, dto, userId);
    return {
      success: true,
      data: settings,
    };
  }
}


