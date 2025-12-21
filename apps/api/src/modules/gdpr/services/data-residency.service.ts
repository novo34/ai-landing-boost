import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Servicio para gestionar y validar data residency según GDPR/FADP
 * 
 * Garantiza que los datos se almacenan y procesan según la región configurada
 * por el tenant (EU o CH)
 */
@Injectable()
export class DataResidencyService {
  private readonly logger = new Logger(DataResidencyService.name);

  // Mapeo de regiones a regiones de AWS
  private readonly regionMapping: Record<string, string> = {
    EU: process.env.AWS_EU_REGION || 'eu-central-1', // Frankfurt (GDPR compliant)
    CH: process.env.AWS_CH_REGION || 'eu-central-1', // Usar EU para Suiza (FADP compliant)
  };

  // Mapeo de regiones a buckets S3
  private readonly bucketMapping: Record<string, string> = {
    EU: process.env.AWS_EU_BUCKET || process.env.AWS_S3_BUCKET || '',
    CH: process.env.AWS_CH_BUCKET || process.env.AWS_S3_BUCKET || '',
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene la región de datos configurada para un tenant
   */
  async getTenantDataRegion(tenantId: string): Promise<string> {
    try {
      // Primero intentar obtener de tenant settings
      const settings = await this.prisma.tenantsettings.findUnique({
        where: { tenantId },
        select: { dataRegion: true },
      });

      if (settings?.dataRegion) {
        return settings.dataRegion;
      }

      // Si no hay settings, obtener del tenant
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { dataRegion: true },
      });

      return tenant?.dataRegion || 'EU'; // Default a EU
    } catch (error) {
      this.logger.error(
        `Error getting tenant data region for ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 'EU'; // Default seguro
    }
  }

  /**
   * Valida que una región es válida para data residency
   */
  validateDataRegion(region: string): boolean {
    return region === 'EU' || region === 'CH';
  }

  /**
   * Obtiene la región de AWS correspondiente a la región de datos del tenant
   */
  async getAwsRegionForTenant(tenantId: string): Promise<string> {
    const dataRegion = await this.getTenantDataRegion(tenantId);
    return this.regionMapping[dataRegion] || this.regionMapping.EU;
  }

  /**
   * Obtiene el bucket S3 correspondiente a la región de datos del tenant
   */
  async getS3BucketForTenant(tenantId: string): Promise<string> {
    const dataRegion = await this.getTenantDataRegion(tenantId);
    return this.bucketMapping[dataRegion] || this.bucketMapping.EU;
  }

  /**
   * Valida que el almacenamiento se está haciendo en la región correcta
   * 
   * @param tenantId ID del tenant
   * @param actualRegion Región donde se está almacenando actualmente
   * @returns true si la región es correcta, lanza excepción si no
   */
  async validateStorageRegion(tenantId: string, actualRegion: string): Promise<boolean> {
    const expectedRegion = await this.getAwsRegionForTenant(tenantId);
    
    if (actualRegion !== expectedRegion) {
      const dataRegion = await this.getTenantDataRegion(tenantId);
      this.logger.error(
        `Data residency violation for tenant ${tenantId}: expected region ${expectedRegion} (${dataRegion}), but got ${actualRegion}`,
      );
      throw new BadRequestException({
        success: false,
        error_key: 'gdpr.data_residency_violation',
        message: `Data must be stored in region ${expectedRegion} (${dataRegion}), but attempted to store in ${actualRegion}`,
        expectedRegion,
        actualRegion,
        dataRegion,
      });
    }

    return true;
  }

  /**
   * Verifica el cumplimiento de data residency para un tenant
   * 
   * @param tenantId ID del tenant
   * @returns Información sobre el cumplimiento de data residency
   */
  async verifyCompliance(tenantId: string): Promise<{
    compliant: boolean;
    dataRegion: string;
    awsRegion: string;
    s3Bucket: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const dataRegion = await this.getTenantDataRegion(tenantId);
      const awsRegion = await this.getAwsRegionForTenant(tenantId);
      const s3Bucket = await this.getS3BucketForTenant(tenantId);

      // Validar que la región está configurada
      if (!this.validateDataRegion(dataRegion)) {
        issues.push(`Invalid data region configured: ${dataRegion}`);
      }

      // Validar que las regiones de AWS están configuradas
      if (!awsRegion) {
        issues.push('AWS region not configured for data residency');
      }

      if (!s3Bucket) {
        issues.push('S3 bucket not configured for data residency');
      }

      // Verificar que las variables de entorno están configuradas
      if (dataRegion === 'EU' && !process.env.AWS_EU_REGION && !process.env.AWS_REGION) {
        issues.push('AWS EU region not configured in environment variables');
      }

      if (dataRegion === 'CH' && !process.env.AWS_CH_REGION && !process.env.AWS_REGION) {
        issues.push('AWS CH region not configured in environment variables');
      }

      return {
        compliant: issues.length === 0,
        dataRegion,
        awsRegion,
        s3Bucket,
        issues,
      };
    } catch (error) {
      issues.push(`Error verifying compliance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        compliant: false,
        dataRegion: 'UNKNOWN',
        awsRegion: 'UNKNOWN',
        s3Bucket: 'UNKNOWN',
        issues,
      };
    }
  }

  /**
   * Obtiene información sobre la configuración de data residency
   * Útil para documentación y auditoría
   */
  async getDataResidencyInfo(tenantId: string): Promise<{
    tenantId: string;
    dataRegion: string;
    awsRegion: string;
    s3Bucket: string;
    configuredAt: string;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
  }> {
    try {
      const dataRegion = await this.getTenantDataRegion(tenantId);
      const awsRegion = await this.getAwsRegionForTenant(tenantId);
      const s3Bucket = await this.getS3BucketForTenant(tenantId);
      const compliance = await this.verifyCompliance(tenantId);

      // Obtener fecha de configuración
      const settings = await this.prisma.tenantsettings.findUnique({
        where: { tenantId },
        select: { updatedAt: true },
      });

      return {
        tenantId,
        dataRegion,
        awsRegion,
        s3Bucket,
        configuredAt: settings?.updatedAt?.toISOString() || new Date().toISOString(),
        complianceStatus: compliance.compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      };
    } catch (error) {
      this.logger.error(
        `Error getting data residency info for ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        tenantId,
        dataRegion: 'UNKNOWN',
        awsRegion: 'UNKNOWN',
        s3Bucket: 'UNKNOWN',
        configuredAt: new Date().toISOString(),
        complianceStatus: 'UNKNOWN',
      };
    }
  }
}
