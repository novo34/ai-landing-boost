import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo plan de suscripción
   */
  async createPlan(dto: CreatePlanDto) {
    try {
      // Validar que el slug sea único
      const existing = await this.prisma.subscriptionplan.findUnique({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.plan_slug_exists',
        });
      }

      const plan = await this.prisma.subscriptionplan.create({
        data: createData({
          name: dto.name,
          slug: dto.slug,
          description: dto.description || null,
          currency: dto.currency,
          priceCents: dto.priceCents,
          interval: dto.interval,
          maxAgents: dto.maxAgents || null,
          maxChannels: dto.maxChannels || null,
        }),
        include: {
          _count: {
            select: { tenantsubscription: true },
          },
        },
      });

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating plan', error);
      throw error;
    }
  }

  /**
   * Lista todos los planes
   */
  async listPlans() {
    try {
      const plans = await this.prisma.subscriptionplan.findMany({
        include: {
          _count: {
            select: { tenantsubscription: true },
          },
        },
        orderBy: { priceCents: 'asc' },
      });

      // Calcular ingresos generados por cada plan
      const plansWithRevenue = await Promise.all(
        plans.map(async (plan) => {
          const activeSubscriptions = await this.prisma.tenantsubscription.count({
            where: {
              planId: plan.id,
              status: { in: ['ACTIVE', 'TRIAL'] },
            },
          });

          const monthlyRevenue =
            plan.interval === 'MONTHLY'
              ? (plan.priceCents / 100) * activeSubscriptions
              : (plan.priceCents / 100 / 12) * activeSubscriptions;

          return {
            ...plan,
            activeSubscriptions,
            monthlyRevenue,
          };
        }),
      );

      return {
        success: true,
        data: plansWithRevenue,
      };
    } catch (error) {
      this.logger.error('Error listing plans', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un plan
   */
  async getPlanDetails(planId: string) {
    try {
      const plan = await this.prisma.subscriptionplan.findUnique({
        where: { id: planId },
        include: {
          tenantsubscription: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                },
              },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { tenantsubscription: true },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.plan_not_found',
        });
      }

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting plan details', error);
      throw error;
    }
  }

  /**
   * Actualiza un plan
   */
  async updatePlan(planId: string, dto: UpdatePlanDto) {
    try {
      const plan = await this.prisma.subscriptionplan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.plan_not_found',
        });
      }

      // Si se cambia el slug, validar unicidad
      if (dto.slug && dto.slug !== plan.slug) {
        const existing = await this.prisma.subscriptionplan.findUnique({
          where: { slug: dto.slug },
        });
        if (existing) {
          throw new BadRequestException({
            success: false,
            error_key: 'platform.plan_slug_exists',
          });
        }
      }

      const updated = await this.prisma.subscriptionplan.update({
        where: { id: planId },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          currency: dto.currency,
          priceCents: dto.priceCents,
          interval: dto.interval,
          maxAgents: dto.maxAgents,
          maxChannels: dto.maxChannels,
        },
        include: {
          _count: {
            select: { tenantsubscription: true },
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
      this.logger.error('Error updating plan', error);
      throw error;
    }
  }

  /**
   * Elimina un plan (solo si no tiene suscripciones activas)
   */
  async deletePlan(planId: string) {
    try {
      const plan = await this.prisma.subscriptionplan.findUnique({
        where: { id: planId },
        include: {
          _count: {
            select: { tenantsubscription: true },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.plan_not_found',
        });
      }

      if (plan._count.tenantsubscription > 0) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.plan_has_subscriptions',
        });
      }

      await this.prisma.subscriptionplan.delete({
        where: { id: planId },
      });

      return {
        success: true,
        message: 'Plan deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deleting plan', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de planes
   */
  async getPlansMetrics() {
    try {
      const [
        totalPlans,
        totalSubscriptions,
        activeSubscriptions,
        totalRevenue,
        plansByInterval,
      ] = await Promise.all([
        this.prisma.subscriptionplan.count(),
        this.prisma.tenantsubscription.count(),
        this.prisma.tenantsubscription.count({
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        }),
        this.calculateTotalRevenue(),
        this.prisma.subscriptionplan.groupBy({
          by: ['interval'],
          _count: true,
        }),
      ]);

      return {
        success: true,
        data: {
          totalPlans,
          totalSubscriptions,
          activeSubscriptions,
          totalRevenue,
          plansByInterval: plansByInterval.reduce((acc, item) => {
            acc[item.interval] = item._count;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      this.logger.error('Error getting plans metrics', error);
      throw error;
    }
  }

  /**
   * Calcula el ingreso total mensual (MRR)
   */
  private async calculateTotalRevenue(): Promise<number> {
    try {
      const activeSubscriptions = await this.prisma.tenantsubscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
        include: {
          subscriptionplan: true,
        },
      });

      let mrr = 0;
      for (const sub of activeSubscriptions) {
        if (sub.subscriptionplan.interval === 'MONTHLY') {
          mrr += sub.subscriptionplan.priceCents / 100;
        } else if (sub.subscriptionplan.interval === 'YEARLY') {
          mrr += sub.subscriptionplan.priceCents / 100 / 12;
        }
      }

      return mrr;
    } catch (error) {
      this.logger.error('Error calculating total revenue', error);
      return 0;
    }
  }
}
