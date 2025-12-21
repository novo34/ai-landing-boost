import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Express } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { StorageService } from '../storage/storage.service';
import { CacheService } from '../../common/cache/cache.service';
import * as path from 'path';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class TenantSettingsService {
  private readonly logger = new Logger(TenantSettingsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private cache: CacheService,
  ) {}

  /**
   * Obtiene las configuraciones del tenant (con cache)
   */
  async getSettings(tenantId: string) {
    const cacheKey = `tenant-settings:${tenantId}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }
    
    // Query optimizada con select solo de campos necesarios
    let settings = await this.prisma.tenantsettings.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        defaultLocale: true,
        timeZone: true,
        country: true,
        dataRegion: true,
        whatsappProvider: true,
        calendarProvider: true,
        businessType: true,
        industryNotes: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Si no existen settings, crear unas por defecto
    if (!settings) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          defaultLocale: true,
          country: true,
          dataRegion: true,
        },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'tenants.not_found',
        });
      }

      settings = await this.prisma.tenantsettings.create({
        data: createData({
          tenantId,
          defaultLocale: tenant.defaultLocale || 'es',
          timeZone: 'Europe/Madrid',
          country: tenant.country || 'ES',
          dataRegion: tenant.dataRegion || 'EU',
          whatsappProvider: 'NONE',
          calendarProvider: 'NONE',
        }),
      });
      
      // Seleccionar solo campos necesarios después de crear
      settings = await this.prisma.tenantsettings.findUnique({
        where: { tenantId },
        select: {
          id: true,
          tenantId: true,
          defaultLocale: true,
          timeZone: true,
          country: true,
          dataRegion: true,
          whatsappProvider: true,
          calendarProvider: true,
          businessType: true,
          industryNotes: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    
    // Guardar en cache (5 minutos)
    this.cache.set(cacheKey, settings, 5 * 60 * 1000);

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Actualiza las configuraciones del tenant
   */
  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    // Verificar que el tenant existe
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        defaultLocale: true,
        country: true,
        dataRegion: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException({
        success: false,
        error_key: 'tenants.not_found',
      });
    }

    // Actualizar o crear settings
    const settings = await this.prisma.tenantsettings.upsert({
      where: { tenantId },
      update: dto,
      create: createData({
        tenantId,
        defaultLocale: dto.defaultLocale || tenant.defaultLocale || 'es',
        timeZone: dto.timeZone || 'Europe/Madrid',
        country: dto.country || tenant.country || 'ES',
        dataRegion: dto.dataRegion || tenant.dataRegion || 'EU',
        whatsappProvider: dto.whatsappProvider || 'NONE',
        calendarProvider: dto.calendarProvider || 'NONE',
        businessType: dto.businessType,
        industryNotes: dto.industryNotes,
      }),
    });

    // Invalidar cache
    this.cache.delete(`tenant-settings:${tenantId}`);

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Sube un logo para el tenant
   */
  async uploadLogo(tenantId: string, file: Express.Multer.File) {
    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_file_type',
        message: 'Only PNG, JPG, and SVG files are allowed',
      });
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.file_too_large',
        message: 'File size must be less than 5MB',
      });
    }

    // Obtener settings actuales para eliminar logo anterior si existe
    const settings = await this.prisma.tenantsettings.findUnique({
      where: { tenantId },
    });

    if (settings?.logoUrl) {
      try {
        await this.storageService.delete(settings.logoUrl, tenantId);
      } catch (error) {
        this.logger.warn(`Could not delete old logo: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Generar path para el nuevo logo
    const ext = path.extname(file.originalname);
    const filename = `logo${ext}`;
    const filePath = `${tenantId}/${filename}`;

    // Subir archivo usando StorageService (respeta data residency del tenant)
    const publicUrl = await this.storageService.upload(file, filePath, tenantId);

    // Actualizar settings con URL pública
    await this.prisma.tenantsettings.upsert({
      where: { tenantId },
      update: { logoUrl: publicUrl },
      create: createData({
        tenantId,
        logoUrl: publicUrl,
        defaultLocale: 'es',
        timeZone: 'Europe/Madrid',
        country: 'ES',
        dataRegion: 'EU',
        whatsappProvider: 'NONE',
        calendarProvider: 'NONE',
      }),
    });

    return {
      success: true,
      data: { logoUrl: publicUrl },
    };
  }

  /**
   * Elimina el logo del tenant
   */
  async deleteLogo(tenantId: string) {
    const settings = await this.prisma.tenantsettings.findUnique({
      where: { tenantId },
    });

    if (settings?.logoUrl) {
      try {
        await this.storageService.delete(settings.logoUrl, tenantId);
      } catch (error) {
        this.logger.warn(`Could not delete logo file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Si no existen settings, no hay nada que eliminar
    if (!settings) {
      return {
        success: true,
        data: { message: 'Logo deleted' },
      };
    }

    await this.prisma.tenantsettings.update({
      where: { tenantId },
      data: { logoUrl: null },
    });

    return {
      success: true,
      data: { message: 'Logo deleted' },
    };
  }

  /**
   * Actualiza colores del tenant
   */
  async updateColors(
    tenantId: string,
    primaryColor?: string,
    secondaryColor?: string,
  ) {
    // Validar formato de colores (hex)
    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_color_format',
        message: 'Color must be in hex format (#RRGGBB)',
      });
    }

    if (secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(secondaryColor)) {
      throw new BadRequestException({
        success: false,
        error_key: 'branding.invalid_color_format',
        message: 'Color must be in hex format (#RRGGBB)',
      });
    }

    const updateData: any = {};
    if (primaryColor !== undefined) {
      updateData.primaryColor = primaryColor;
    }
    if (secondaryColor !== undefined) {
      updateData.secondaryColor = secondaryColor;
    }

    await this.prisma.tenantsettings.upsert({
      where: { tenantId },
      update: updateData,
      create: createData({
        tenantId,
        defaultLocale: 'es',
        timeZone: 'Europe/Madrid',
        country: 'ES',
        dataRegion: 'EU',
        whatsappProvider: 'NONE',
        calendarProvider: 'NONE',
        ...updateData,
      }),
    });

    return {
      success: true,
      data: await this.prisma.tenantsettings.findUnique({
        where: { tenantId },
      }),
    };
  }
}

