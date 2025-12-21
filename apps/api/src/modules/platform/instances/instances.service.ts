import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class InstancesService {
  private readonly logger = new Logger(InstancesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva instancia
   */
  async createInstance(dto: CreateInstanceDto) {
    try {
      // Validar que el dominio sea único
      const existing = await this.prisma.platforminstance.findUnique({
        where: { domain: dto.domain },
      });

      if (existing) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.instance_domain_exists',
        });
      }

      const instance = await this.prisma.platforminstance.create({
        data: createData({
          name: dto.name,
          domain: dto.domain,
          databaseUrl: dto.databaseUrl,
          stripeKey: dto.stripeKey || null,
          n8nUrl: dto.n8nUrl || null,
          status: dto.status || 'ACTIVE',
        }),
        include: {
          _count: {
            select: { tenants: true },
          },
        },
      });

      return {
        success: true,
        data: instance,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating instance', error);
      throw error;
    }
  }

  /**
   * Lista todas las instancias
   */
  async listInstances() {
    try {
      const instances = await this.prisma.platforminstance.findMany({
        include: {
          _count: {
            select: { tenants: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: instances,
      };
    } catch (error) {
      this.logger.error('Error listing instances', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una instancia
   */
  async getInstanceDetails(instanceId: string) {
    try {
      const instance = await this.prisma.platforminstance.findUnique({
        where: { id: instanceId },
        include: {
          tenants: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              createdAt: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { tenants: true },
          },
        },
      });

      if (!instance) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.instance_not_found',
        });
      }

      return {
        success: true,
        data: instance,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting instance details', error);
      throw error;
    }
  }

  /**
   * Actualiza una instancia
   */
  async updateInstance(instanceId: string, dto: UpdateInstanceDto) {
    try {
      const instance = await this.prisma.platforminstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.instance_not_found',
        });
      }

      // Si se cambia el dominio, validar unicidad
      if (dto.domain && dto.domain !== instance.domain) {
        const existing = await this.prisma.platforminstance.findUnique({
          where: { domain: dto.domain },
        });
        if (existing) {
          throw new BadRequestException({
            success: false,
            error_key: 'platform.instance_domain_exists',
          });
        }
      }

      const updated = await this.prisma.platforminstance.update({
        where: { id: instanceId },
        data: {
          name: dto.name,
          domain: dto.domain,
          databaseUrl: dto.databaseUrl,
          stripeKey: dto.stripeKey,
          n8nUrl: dto.n8nUrl,
          status: dto.status,
        },
        include: {
          _count: {
            select: { tenants: true },
          },
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating instance', error);
      throw error;
    }
  }

  /**
   * Asigna un tenant a una instancia
   */
  async assignTenantToInstance(tenantId: string, instanceId: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      const instance = await this.prisma.platforminstance.findUnique({
        where: { id: instanceId },
      });

      if (!instance) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.instance_not_found',
        });
      }

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          instanceId,
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error assigning tenant to instance', error);
      throw error;
    }
  }

  /**
   * Elimina una instancia (solo si no tiene tenants)
   */
  async deleteInstance(instanceId: string) {
    try {
      const instance = await this.prisma.platforminstance.findUnique({
        where: { id: instanceId },
        include: {
          _count: {
            select: { tenants: true },
          },
        },
      });

      if (!instance) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.instance_not_found',
        });
      }

      if (instance._count.tenants > 0) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.instance_has_tenants',
        });
      }

      await this.prisma.platforminstance.delete({
        where: { id: instanceId },
      });

      return {
        success: true,
        message: 'Instance deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deleting instance', error);
      throw error;
    }
  }
}
