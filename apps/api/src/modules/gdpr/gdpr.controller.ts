import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { GdprService } from './gdpr.service';
import { AnonymizeUserDto } from './dto/anonymize-user.dto';
import { ExportDataDto } from './dto/export-data.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { UpdateRetentionPolicyDto } from './dto/update-retention-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { $Enums } from '@prisma/client';
import { UseGuards } from '@nestjs/common';

@Controller('gdpr')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  /**
   * Anonimiza los datos de un usuario
   * Requiere rol OWNER o ADMIN y email verificado
   */
  @Post('anonymize/:userId')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async anonymizeUser(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('userId') userId: string,
    @Body() dto: AnonymizeUserDto,
  ) {
    return this.gdprService.anonymizeUser(tenant.id, userId, dto.reason);
  }

  /**
   * Exporta todos los datos de un usuario
   * Requiere rol OWNER o ADMIN y email verificado
   */
  @Post('export/:userId')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async exportUserData(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('userId') userId: string,
    @Body() dto: ExportDataDto,
  ) {
    return this.gdprService.exportUserData(tenant.id, userId, dto.format);
  }

  /**
   * Elimina completamente los datos de un usuario (Right to be forgotten)
   * Requiere rol OWNER y email verificado
   */
  @Post('delete/:userId')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER)
  @HttpCode(HttpStatus.OK)
  async deleteUserData(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('userId') userId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.gdprService.deleteUserData(tenant.id, userId, dto.reason);
  }

  /**
   * Registra un consentimiento
   */
  @Post('consents')
  @HttpCode(HttpStatus.CREATED)
  async createConsent(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateConsentDto,
    @Req() req: Request,
  ) {
    // Obtener userId del token JWT si está disponible
    const userId = (req as any).user?.id || null;
    
    // Obtener IP y User-Agent de la request
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    return this.gdprService.logConsent(
      tenant.id,
      userId,
      dto.consentType,
      dto.granted,
      dto.ipAddress || ipAddress,
      dto.userAgent || userAgent,
    );
  }

  /**
   * Obtiene el historial de consentimientos
   */
  @Get('consents')
  @HttpCode(HttpStatus.OK)
  async getConsents(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('userId') userId?: string,
  ) {
    return this.gdprService.getConsents(tenant.id, userId);
  }

  /**
   * Crea o actualiza una política de retención de datos
   * Requiere rol OWNER o ADMIN
   */
  @Post('retention-policies')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRetentionPolicy(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateRetentionPolicyDto,
  ) {
    return this.gdprService.createRetentionPolicy(tenant.id, dto);
  }

  /**
   * Obtiene las políticas de retención del tenant
   */
  @Get('retention-policies')
  @HttpCode(HttpStatus.OK)
  async getRetentionPolicies(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.gdprService.getRetentionPolicies(tenant.id);
  }

  /**
   * Actualiza una política de retención
   * Requiere rol OWNER o ADMIN
   */
  @Put('retention-policies/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRetentionPolicy(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ) {
    // Obtener la política actual
    const policies = await this.gdprService.getRetentionPolicies(tenant.id);
    const policy = policies.data?.find((p) => p.id === id);

    if (!policy) {
      throw new Error('Policy not found');
    }

    return this.gdprService.createRetentionPolicy(tenant.id, {
      dataType: policy.dataType,
      retentionDays: dto.retentionDays ?? policy.retentionDays,
      autoDelete: dto.autoDelete ?? policy.autoDelete,
    });
  }

  /**
   * Aplica las políticas de retención de datos
   * Requiere rol OWNER o ADMIN
   */
  @Post('apply-retention')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async applyRetentionPolicies(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.gdprService.applyRetentionPolicies(tenant.id);
  }

  /**
   * Obtiene información sobre data residency y cumplimiento
   * Requiere rol OWNER o ADMIN
   */
  @Get('data-residency')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getDataResidencyInfo(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.gdprService.getDataResidencyInfo(tenant.id);
  }

  /**
   * Verifica el cumplimiento de data residency
   * Requiere rol OWNER o ADMIN
   */
  @Get('data-residency/verify')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async verifyDataResidencyCompliance(
    @CurrentTenant() tenant: { id: string; role: string },
  ) {
    return this.gdprService.verifyDataResidencyCompliance(tenant.id);
  }
}

