import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMessagingService } from './whatsapp-messaging.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { SubscriptionStatusGuard } from '../../common/guards/subscription-status.guard';
import { $Enums } from '@prisma/client';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly messagingService: WhatsAppMessagingService,
  ) {}

  /**
   * Lista todas las cuentas de WhatsApp del tenant
   */
  @Get('accounts')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getAccounts(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.whatsappService.getAccounts(tenant.id);
  }

  /**
   * Obtiene una cuenta específica por ID
   */
  @Get('accounts/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getAccountById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.getAccountById(tenant.id, id);
  }

  /**
   * Crea una nueva cuenta de WhatsApp
   */
  @Post('accounts')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateAccountDto,
  ) {
    return this.whatsappService.createAccount(tenant.id, dto);
  }

  /**
   * Actualiza una cuenta de WhatsApp
   */
  @Put('accounts/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.whatsappService.updateAccount(tenant.id, id, dto);
  }

  /**
   * Elimina una cuenta de WhatsApp
   */
  @Delete('accounts/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.deleteAccount(tenant.id, id);
  }

  /**
   * Valida la conexión de una cuenta
   */
  @Post('accounts/:id/validate')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async validateAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.validateAccount(tenant.id, id);
  }

  /**
   * Reconecta una cuenta (obtiene nuevo QR si es necesario)
   */
  @Post('accounts/:id/reconnect')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reconnectAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.reconnectAccount(tenant.id, id);
  }

  /**
   * Obtiene el QR code de una cuenta (Evolution API)
   */
  @Get('accounts/:id/qr')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getQRCode(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.getQRCode(tenant.id, id);
  }

  /**
   * Envía un mensaje de WhatsApp
   */
  @Post('send')
  @UseGuards(EmailVerifiedGuard, SubscriptionStatusGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(
      tenant.id,
      dto.to,
      dto.message,
      dto.whatsappAccountId,
    );
  }
}

