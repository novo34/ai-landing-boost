import { Controller, Get, Put, Post, Delete, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { UpdateColorsDto } from './dto/update-colors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { $Enums } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Express } from 'express';

@Controller('tenants/settings')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getSettings(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.tenantSettingsService.getSettings(tenant.id);
  }

  @Put()
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateSettings(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantSettingsService.updateSettings(tenant.id, dto);
  }

  /**
   * Sube un logo para el tenant
   */
  @Post('logo')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadLogo(
    @CurrentTenant() tenant: { id: string; role: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.no_file',
        message: 'No file uploaded',
      });
    }
    return this.tenantSettingsService.uploadLogo(tenant.id, file);
  }

  /**
   * Elimina el logo del tenant
   */
  @Delete('logo')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async deleteLogo(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.tenantSettingsService.deleteLogo(tenant.id);
  }

  /**
   * Actualiza colores del tenant
   */
  @Put('colors')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateColors(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: UpdateColorsDto,
  ) {
    return this.tenantSettingsService.updateColors(
      tenant.id,
      dto.primaryColor,
      dto.secondaryColor,
    );
  }
}

