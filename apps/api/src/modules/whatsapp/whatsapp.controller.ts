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
import { ConnectEvolutionDto } from './dto/connect-evolution.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
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
   * Conecta Evolution API del tenant
   */
  @Post('evolution/connect')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async connectEvolution(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: ConnectEvolutionDto,
  ) {
    return this.whatsappService.connectEvolution(tenant.id, dto);
  }

  /**
   * Testa conexión Evolution API del tenant
   */
  @Post('evolution/test')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testEvolutionConnection(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.whatsappService.testEvolutionConnection(tenant.id);
  }

  /**
   * Obtiene estado de conexión Evolution del tenant
   */
  @Get('evolution/status')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getEvolutionConnectionStatus(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.whatsappService.getEvolutionConnectionStatus(tenant.id);
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
    @Body() dto: CreateAccountDto | CreateInstanceDto,
  ) {
    // Si tiene provider, es CreateAccountDto (legacy)
    // Si no tiene provider pero tiene instanceName o phoneNumber, es CreateInstanceDto
    if ('provider' in dto) {
      return this.whatsappService.createAccount(tenant.id, dto as CreateAccountDto);
    } else {
      // Es CreateInstanceDto para Evolution API
      return this.whatsappService.createInstance(tenant.id, dto as CreateInstanceDto);
    }
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
   * NOTA: No usar getAccountById aquí porque filtra por tenantId y puede fallar con legacy huérfana.
   * deleteInstance y deleteAccount ya validan ownership usando la policy central.
   */
  @Delete('accounts/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    // Obtener solo el provider sin validar ownership (la policy lo hará)
    const account = await this.whatsappService.getAccountByIdUnsafe(id);
    if (account?.provider === 'EVOLUTION_API') {
      return this.whatsappService.deleteInstance(tenant.id, id);
    }
    return this.whatsappService.deleteAccount(tenant.id, id);
  }

  /**
   * Obtiene estado detallado de una instancia
   */
  @Get('accounts/:id/status')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getInstanceStatus(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.getInstanceStatus(tenant.id, id);
  }

  /**
   * Conecta una instancia (obtiene nuevo QR)
   */
  @Post('accounts/:id/connect')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async connectInstance(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.connectInstance(tenant.id, id);
  }

  /**
   * Desconecta una instancia
   */
  @Post('accounts/:id/disconnect')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async disconnectInstance(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.whatsappService.disconnectInstance(tenant.id, id);
  }

  /**
   * Sincroniza instancias con Evolution API del tenant
   */
  @Post('accounts/sync')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async syncInstances(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.whatsappService.syncInstances(tenant.id);
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

