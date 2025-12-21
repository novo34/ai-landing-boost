# AI-SPEC-46: Panel de Administración de Plataforma (Platform Owner)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-46  
> **Prioridad:** 🔴 CRÍTICA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── platform/
│   │   ├── platform.module.ts                    [CREAR]
│   │   ├── platform.service.ts                   [CREAR]
│   │   ├── platform.controller.ts               [CREAR]
│   │   ├── dto/
│   │   │   ├── create-tenant.dto.ts            [CREAR]
│   │   │   ├── update-tenant.dto.ts             [CREAR]
│   │   │   ├── change-plan.dto.ts               [CREAR]
│   │   │   └── apply-adjustment.dto.ts          [CREAR]
│   │   └── guards/
│   │       └── platform-owner.guard.ts         [CREAR]
│   ├── tenants/
│   │   └── tenants.controller.ts                [MODIFICAR] - Agregar endpoints de plataforma
│   ├── billing/
│   │   └── billing.controller.ts               [MODIFICAR] - Agregar endpoints de plataforma
│   └── subscription-plans/
│       ├── subscription-plans.module.ts        [CREAR]
│       ├── subscription-plans.service.ts       [CREAR]
│       └── subscription-plans.controller.ts    [CREAR]
├── common/
│   ├── guards/
│   │   └── platform.guard.ts                    [CREAR]
│   └── decorators/
│       ├── platform-user.decorator.ts           [CREAR]
│       └── platform-roles.decorator.ts          [CREAR]
└── prisma/
    └── schema.prisma                             [MODIFICAR] - Agregar platformRole y audit logs
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar campos para roles de plataforma y auditoría

```prisma
// Agregar enum para roles de plataforma
enum PlatformRole {
  PLATFORM_OWNER
  PLATFORM_ADMIN
  PLATFORM_SUPPORT
}

// Modificar modelo User
model user {
  id            String       @id @default(cuid())
  email         String       @unique
  passwordHash  String?
  name          String?
  locale        String?
  timeZone      String?
  platformRole  PlatformRole? // Nuevo campo
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // ... relaciones existentes
  memberships   tenantmembership[]
  platformAuditLogs platformauditlog[] // Nueva relación
}

// Crear modelo para logs de auditoría de plataforma
model platformauditlog {
  id          String       @id @default(cuid())
  userId      String       // PLATFORM_OWNER que realizó la acción
  action      String       // Tipo de acción (CREATE_TENANT, UPDATE_TENANT, etc.)
  resourceType String      // Tipo de recurso (TENANT, SUBSCRIPTION, PLAN, etc.)
  resourceId  String?      // ID del recurso afectado
  metadata    Json?        // Datos adicionales (antes/después, etc.)
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime     @default(now())
  
  user        user         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("PlatformAuditLog")
}
```

---

### 2. Crear Platform Owner Guard

**Archivo:** `apps/api/src/common/guards/platform-owner.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_ROLES_KEY, PlatformRole } from '../decorators/platform-roles.decorator';

/**
 * PlatformGuard
 * 
 * Verifica que el usuario tiene un rol de plataforma (PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT).
 * Puede aceptar roles específicos como parámetro.
 * 
 * Requisitos:
 * 1. JwtAuthGuard debe estar aplicado (para obtener request.user)
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, PlatformGuard)
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Cualquier rol de plataforma puede acceder
 * }
 * 
 * @UseGuards(JwtAuthGuard, PlatformGuard(['PLATFORM_OWNER', 'PLATFORM_ADMIN']))
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Solo OWNER o ADMIN pueden acceder
 * }
 */
@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.unauthorized',
      });
    }

    // Obtener roles requeridos del decorador (si existe)
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Verificar que el usuario tiene un platformRole
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { platformRole: true },
    });

    if (!userWithRole || !userWithRole.platformRole) {
      throw new ForbiddenException({
        success: false,
        error_key: 'platform.insufficient_permissions',
        message: 'Platform role required',
      });
    }

    // Si hay roles requeridos, verificar que el usuario tiene uno de ellos
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userWithRole.platformRole)) {
        throw new ForbiddenException({
          success: false,
          error_key: 'platform.insufficient_permissions',
          message: 'Insufficient platform permissions',
        });
      }
    }

    // Adjuntar información de plataforma al request
    request.platformUser = {
      userId: user.userId,
      email: user.email,
      platformRole: userWithRole.platformRole,
    };

    return true;
  }
}
```

---

### 3. Crear Decorator para Platform Owner

**Archivo:** `apps/api/src/common/decorators/platform-owner.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para obtener información del usuario de plataforma actual
 * 
 * Uso:
 * @Get('endpoint')
 * async myEndpoint(@PlatformUser() platformUser: { userId: string; email: string; platformRole: string }) {
 *   // platformUser disponible
 * }
 */
export const PlatformUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.platformUser;
  },
);

/**
 * Decorator para especificar roles de plataforma requeridos
 * 
 * Archivo: `apps/api/src/common/decorators/platform-roles.decorator.ts`
 * 
 * Uso:
 * @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
 * @Get('endpoint')
 * async myEndpoint() {
 *   // Solo OWNER o ADMIN pueden acceder
 * }
 */
import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ROLES_KEY = 'platform-roles';
export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT';

export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);
```

---

### 4. Crear Platform Service

**Archivo:** `apps/api/src/modules/platform/platform.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class PlatformService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene métricas globales del SaaS
   */
  async getGlobalMetrics() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      activeUsersLast30Days,
      totalAgents,
      totalChannels,
      totalConversations,
      mrr,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'TRIAL' } }),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.agent.count({ where: { isActive: true } }),
      this.prisma.channel.count({ where: { isActive: true } }),
      this.prisma.conversation.count(),
      this.calculateMRR(),
    ]);

    // Calcular crecimiento de tenants (últimos 30 días)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newTenantsLast30Days = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      success: true,
      data: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          trial: trialTenants,
          suspended: suspendedTenants,
          newLast30Days: newTenantsLast30Days,
        },
        users: {
          total: totalUsers,
          activeLast30Days: activeUsersLast30Days,
        },
        usage: {
          agents: totalAgents,
          channels: totalChannels,
          conversations: totalConversations,
        },
        revenue: {
          mrr,
        },
      },
    };
  }

  /**
   * Calcula MRR (Monthly Recurring Revenue)
   */
  private async calculateMRR(): Promise<number> {
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
  }

  /**
   * Lista todos los tenants con filtros
   */
  async listTenants(filters: {
    status?: string;
    planId?: string;
    country?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.planId) {
      where.subscriptions = {
        some: {
          planId: filters.planId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      };
    }

    if (filters.country) {
      where.country = filters.country;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL'] } },
            include: { subscriptionplan: true },
            take: 1,
          },
          _count: {
            select: {
              memberships: true,
              agents: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      success: true,
      data: {
        tenants: tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          country: t.country,
          plan: t.subscriptions[0]?.subscriptionplan?.name || 'No plan',
          subscriptionStatus: t.subscriptions[0]?.status || null,
          userCount: t._count.memberships,
          agentCount: t._count.agents,
          createdAt: t.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Obtiene detalles completos de un tenant
   */
  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          include: {
            subscriptionplan: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        settings: true,
        _count: {
          select: {
            agents: true,
            channels: true,
            conversations: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      success: true,
      data: tenant,
    };
  }

  /**
   * Crea un nuevo tenant
   */
  async createTenant(dto: CreateTenantDto, platformOwnerId: string) {
    // Validar que el slug es único
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });

    if (existingTenant) {
      throw new BadRequestException('Tenant slug already exists');
    }

    // Buscar o crear usuario owner
    let owner = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });

    if (!owner) {
      // Crear usuario si no existe
      owner = await this.prisma.user.create({
        data: {
          email: dto.ownerEmail,
          name: dto.ownerName || dto.ownerEmail.split('@')[0],
          emailVerified: false, // Requerirá verificación
        },
      });
    }

    // Crear tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        country: dto.country,
        dataRegion: dto.dataRegion || 'EU',
        status: dto.initialStatus || 'TRIAL',
        trialEndsAt: dto.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días de trial
        settings: {
          create: {
            defaultLocale: dto.defaultLocale || 'es',
            timeZone: dto.timeZone || 'Europe/Madrid',
            country: dto.country,
            dataRegion: dto.dataRegion || 'EU',
          },
        },
        memberships: {
          create: {
            userId: owner.id,
            role: 'OWNER',
          },
        },
        subscriptions: dto.planId
          ? {
              create: {
                planId: dto.planId,
                status: 'TRIAL',
                trialEndsAt: dto.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              },
            }
          : undefined,
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
      },
    });

    // Registrar en audit log
    await this.logAuditAction(platformOwnerId, 'CREATE_TENANT', 'TENANT', tenant.id, {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      ownerEmail: dto.ownerEmail,
    });

    // TODO: Enviar email de bienvenida al owner

    return {
      success: true,
      data: tenant,
    };
  }

  /**
   * Actualiza un tenant
   */
  async updateTenant(tenantId: string, dto: UpdateTenantDto, platformOwnerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Si se cambia el slug, validar unicidad
    if (dto.slug && dto.slug !== tenant.slug) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new BadRequestException('Tenant slug already exists');
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        slug: dto.slug,
        country: dto.country,
        dataRegion: dto.dataRegion,
        status: dto.status,
        trialEndsAt: dto.trialEndsAt,
      },
    });

    // Registrar en audit log
    await this.logAuditAction(platformOwnerId, 'UPDATE_TENANT', 'TENANT', tenantId, {
      changes: dto,
    });

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Suspende un tenant
   */
  async suspendTenant(tenantId: string, reason: string, platformOwnerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.status === 'SUSPENDED') {
      throw new BadRequestException('Tenant is already suspended');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    });

    // Registrar en audit log
    await this.logAuditAction(platformOwnerId, 'SUSPEND_TENANT', 'TENANT', tenantId, {
      reason,
      previousStatus: tenant.status,
    });

    // TODO: Enviar notificación al owner del tenant

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Reactiva un tenant
   */
  async reactivateTenant(tenantId: string, platformOwnerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.status !== 'SUSPENDED') {
      throw new BadRequestException('Tenant is not suspended');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });

    // Registrar en audit log
    await this.logAuditAction(platformOwnerId, 'REACTIVATE_TENANT', 'TENANT', tenantId, {
      previousStatus: tenant.status,
    });

    // TODO: Enviar notificación al owner del tenant

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Elimina un tenant (soft delete)
   */
  async deleteTenant(tenantId: string, platformOwnerId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Soft delete: cambiar estado a CANCELLED
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'CANCELLED' },
    });

    // Registrar en audit log
    await this.logAuditAction(platformOwnerId, 'DELETE_TENANT', 'TENANT', tenantId, {
      tenantName: tenant.name,
    });

    // TODO: Programar eliminación física después de X días (job en background)

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Obtiene logs de auditoría
   */
  async getAuditLogs(filters: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.platformauditlog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.platformauditlog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Registra una acción en el log de auditoría
   */
  private async logAuditAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    await this.prisma.platformauditlog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        metadata,
        ipAddress: request?.ip || null,
        userAgent: request?.userAgent || null,
      },
    });
  }
}
```

---

### 5. Crear Platform Controller

**Archivo:** `apps/api/src/modules/platform/platform.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../common/guards/platform.guard';
import { PlatformUser } from '../../common/decorators/platform-user.decorator';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * Obtiene métricas globales del SaaS
   */
  @Get('metrics')
  async getGlobalMetrics() {
    return this.platformService.getGlobalMetrics();
  }

  /**
   * Lista todos los tenants con filtros
   */
  @Get('tenants')
  async listTenants(
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformService.listTenants({
      status,
      planId,
      country,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Obtiene detalles de un tenant
   */
  @Get('tenants/:tenantId')
  async getTenantDetails(@Param('tenantId') tenantId: string) {
    return this.platformService.getTenantDetails(tenantId);
  }

  /**
   * Crea un nuevo tenant
   */
  @Post('tenants')
  async createTenant(
    @Body() dto: CreateTenantDto,
    @PlatformUser() platformUser: { userId: string; platformRole: string },
    @Req() req: any,
  ) {
    return this.platformService.createTenant(dto, platformUser.userId);
  }

  /**
   * Actualiza un tenant
   */
  @Put('tenants/:tenantId')
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
    @PlatformUser() platformUser: { userId: string; platformRole: string },
  ) {
    return this.platformService.updateTenant(tenantId, dto, platformUser.userId);
  }

  /**
   * Suspende un tenant
   */
  @Post('tenants/:tenantId/suspend')
  async suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @PlatformUser() platformUser: { userId: string; platformRole: string },
  ) {
    return this.platformService.suspendTenant(tenantId, reason, platformUser.userId);
  }

  /**
   * Reactiva un tenant
   */
  @Post('tenants/:tenantId/reactivate')
  async reactivateTenant(
    @Param('tenantId') tenantId: string,
    @PlatformUser() platformUser: { userId: string; platformRole: string },
  ) {
    return this.platformService.reactivateTenant(tenantId, platformUser.userId);
  }

  /**
   * Elimina un tenant
   */
  @Delete('tenants/:tenantId')
  async deleteTenant(
    @Param('tenantId') tenantId: string,
    @PlatformUser() platformUser: { userId: string; platformRole: string },
  ) {
    return this.platformService.deleteTenant(tenantId, platformUser.userId);
  }

  /**
   * Obtiene logs de auditoría
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformService.getAuditLogs({
      action,
      resourceType,
      resourceId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
```

---

### 6. Crear DTOs

**Archivo:** `apps/api/src/modules/platform/dto/create-tenant.dto.ts`

```typescript
import { IsString, IsEmail, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  dataRegion?: string;

  @IsString()
  @IsOptional()
  defaultLocale?: string;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsEnum(['ACTIVE', 'TRIAL', 'SUSPENDED'])
  @IsOptional()
  initialStatus?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}
```

**Archivo:** `apps/api/src/modules/platform/dto/update-tenant.dto.ts`

```typescript
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  dataRegion?: string;

  @IsEnum(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'])
  @IsOptional()
  status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';

  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;
}
```

---

### 7. Crear Platform Module

**Archivo:** `apps/api/src/modules/platform/platform.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
```

---

### 8. Modificar App Module

**Archivo:** `apps/api/src/app.module.ts`

**Acción:** Agregar PlatformModule a imports

```typescript
// ... imports existentes
import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    // ... módulos existentes
    PlatformModule,
  ],
  // ...
})
export class AppModule {}
```

---

## Frontend - Estructura de Archivos

```
apps/web/
├── app/
│   └── platform/
│       ├── layout.tsx                    [CREAR]
│       ├── page.tsx                      [CREAR] - Dashboard
│       ├── tenants/
│       │   ├── page.tsx                  [CREAR] - Lista de tenants
│       │   └── [id]/
│       │       └── page.tsx              [CREAR] - Detalles de tenant
│       ├── billing/
│       │   └── page.tsx                  [CREAR] - Gestión de facturación
│       ├── plans/
│       │   └── page.tsx                  [CREAR] - Gestión de planes
│       └── audit/
│           └── page.tsx                  [CREAR] - Logs de auditoría
├── components/
│   └── platform/
│       ├── platform-sidebar.tsx          [CREAR]
│       ├── metrics-cards.tsx              [CREAR]
│       ├── tenants-table.tsx              [CREAR]
│       ├── tenant-details.tsx             [CREAR]
│       └── audit-logs-table.tsx            [CREAR]
└── lib/
    └── api/
        └── platform-client.ts             [CREAR] - Cliente API para plataforma
```

---

## Implementación Frontend - Ejemplos Clave

### 1. Layout del Panel de Plataforma

**Archivo:** `apps/web/app/platform/layout.tsx`

```typescript
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/client';
import { PlatformSidebar } from '@/components/platform/platform-sidebar';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Verificar que el usuario es PLATFORM_OWNER
  if (!user?.data?.platformRole || user.data.platformRole !== 'PLATFORM_OWNER') {
    redirect('/app');
  }

  return (
    <div className="flex h-screen">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

### 2. Dashboard Principal

**Archivo:** `apps/web/app/platform/page.tsx`

```typescript
import { getPlatformMetrics } from '@/lib/api/platform-client';
import { MetricsCards } from '@/components/platform/metrics-cards';

export default async function PlatformDashboard() {
  const metrics = await getPlatformMetrics();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Plataforma</h1>
      <MetricsCards metrics={metrics.data} />
      {/* Más componentes de dashboard */}
    </div>
  );
}
```

### 3. Cliente API para Plataforma

**Archivo:** `apps/web/lib/api/platform-client.ts`

```typescript
import { apiClient } from './client';

export async function getPlatformMetrics() {
  return apiClient.get('/platform/metrics');
}

export async function listTenants(filters?: {
  status?: string;
  planId?: string;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return apiClient.get('/platform/tenants', { params: filters });
}

export async function getTenantDetails(tenantId: string) {
  return apiClient.get(`/platform/tenants/${tenantId}`);
}

export async function createTenant(data: any) {
  return apiClient.post('/platform/tenants', data);
}

export async function updateTenant(tenantId: string, data: any) {
  return apiClient.put(`/platform/tenants/${tenantId}`, data);
}

export async function suspendTenant(tenantId: string, reason: string) {
  return apiClient.post(`/platform/tenants/${tenantId}/suspend`, { reason });
}

export async function reactivateTenant(tenantId: string) {
  return apiClient.post(`/platform/tenants/${tenantId}/reactivate`);
}

export async function deleteTenant(tenantId: string) {
  return apiClient.delete(`/platform/tenants/${tenantId}`);
}

export async function getAuditLogs(filters?: any) {
  return apiClient.get('/platform/audit-logs', { params: filters });
}
```

---

## Migraciones de Base de Datos

**Archivo:** `apps/api/prisma/migrations/XXXXXX_add_platform_owner/migration.sql`

```sql
-- Agregar enum PlatformRole
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT');

-- Agregar columna platformRole a User
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";

-- Crear tabla PlatformAuditLog
CREATE TABLE "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE INDEX "PlatformAuditLog_userId_idx" ON "PlatformAuditLog"("userId");
CREATE INDEX "PlatformAuditLog_action_idx" ON "PlatformAuditLog"("action");
CREATE INDEX "PlatformAuditLog_resourceType_resourceId_idx" ON "PlatformAuditLog"("resourceType", "resourceId");
CREATE INDEX "PlatformAuditLog_createdAt_idx" ON "PlatformAuditLog"("createdAt");

-- Agregar foreign key
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Implementación de Funcionalidades Avanzadas

### 9. Sistema de Multi-Instancia

**Archivo:** `apps/api/src/modules/platform/instances/instances.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class InstancesService {
  constructor(private prisma: PrismaService) {}

  async createInstance(data: {
    name: string;
    domain: string;
    databaseUrl: string;
    stripeKey?: string;
    n8nUrl?: string;
  }) {
    // Crear nueva instancia en BD
    const instance = await this.prisma.platforminstance.create({
      data: {
        name: data.name,
        domain: data.domain,
        databaseUrl: data.databaseUrl,
        stripeKey: data.stripeKey,
        n8nUrl: data.n8nUrl,
        status: 'ACTIVE',
      },
    });

    return { success: true, data: instance };
  }

  async listInstances() {
    const instances = await this.prisma.platforminstance.findMany({
      include: {
        _count: {
          select: { tenants: true },
        },
      },
    });

    return { success: true, data: instances };
  }

  async switchInstance(instanceId: string, userId: string) {
    // Guardar instancia activa en sesión del usuario
    // Esto se puede hacer en sessionStorage o en BD
    await this.prisma.user.update({
      where: { id: userId },
      data: { activeInstanceId: instanceId },
    });

    return { success: true };
  }
}
```

**Schema Prisma adicional:**

```prisma
model PlatformInstance {
  id          String   @id @default(cuid())
  name        String
  domain      String   @unique
  databaseUrl String
  stripeKey   String?
  n8nUrl      String?
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenants     Tenant[]
  
  @@map("PlatformInstance")
}

// Modificar User para incluir instancia activa
model User {
  // ... campos existentes
  activeInstanceId String?
  activeInstance   PlatformInstance? @relation(fields: [activeInstanceId], references: [id])
}
```

---

### 10. Sistema de Tickets de Soporte

**Archivo:** `apps/api/src/modules/platform/support/support-tickets.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SupportTicketsService {
  constructor(private prisma: PrismaService) {}

  async createTicket(data: {
    tenantId?: string;
    createdBy?: string;
    subject: string;
    description: string;
    category: string;
    priority: string;
  }) {
    const ticket = await this.prisma.supportticket.create({
      data: {
        tenantId: data.tenantId,
        createdBy: data.createdBy,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: 'OPEN',
      },
      include: {
        tenant: true,
        createdByUser: true,
        assignedTo: true,
        messages: true,
      },
    });

    return { success: true, data: ticket };
  }

  async listTickets(filters: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    tenantId?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedToId = filters.assignedTo;
    if (filters.tenantId) where.tenantId = filters.tenantId;

    const tickets = await this.prisma.supportticket.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        createdByUser: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: tickets };
  }

  async addMessage(ticketId: string, data: {
    userId: string;
    message: string;
    isInternal?: boolean;
  }) {
    const message = await this.prisma.ticketmessage.create({
      data: {
        ticketId,
        userId: data.userId,
        message: data.message,
        isInternal: data.isInternal || false,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    // Actualizar última actividad del ticket
    await this.prisma.supportticket.update({
      where: { id: ticketId },
      data: { lastActivityAt: new Date() },
    });

    return { success: true, data: message };
  }
}
```

**Schema Prisma:**

```prisma
model SupportTicket {
  id            String   @id @default(cuid())
  tenantId      String?
  createdById   String?
  assignedToId String?
  subject       String
  description   String
  category      String
  priority      String   // LOW, MEDIUM, HIGH, CRITICAL
  status        String   // OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastActivityAt DateTime @default(now())
  
  tenant       Tenant?  @relation(fields: [tenantId], references: [id])
  createdBy    User?    @relation("TicketCreatedBy", fields: [createdById], references: [id])
  assignedTo   User?    @relation("TicketAssignedTo", fields: [assignedToId], references: [id])
  messages     TicketMessage[]
  
  @@index([status])
  @@index([category])
  @@index([priority])
  @@index([tenantId])
  @@index([assignedToId])
  @@map("SupportTicket")
}

model TicketMessage {
  id          String   @id @default(cuid())
  ticketId    String
  userId      String
  message     String
  isInternal  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  ticket      SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user        User          @relation(fields: [userId], references: [id])
  
  @@index([ticketId])
  @@map("TicketMessage")
}

// Modificar User para incluir relaciones de tickets
model User {
  // ... campos existentes
  createdTickets  SupportTicket[] @relation("TicketCreatedBy")
  assignedTickets SupportTicket[] @relation("TicketAssignedTo")
  ticketMessages  TicketMessage[]
}
```

---

### 11. Sistema de Chat en Vivo

**Archivo:** `apps/api/src/modules/platform/chat/platform-chat.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/platform-chat',
  cors: { origin: '*' },
})
export class PlatformChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    // Verificar autenticación
    const userId = client.handshake.auth.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    // Unir a sala del usuario
    client.join(`user:${userId}`);
  }

  async handleDisconnect(client: Socket) {
    // Limpiar conexiones
  }

  @SubscribeMessage('join-tenant-chat')
  async handleJoinTenantChat(client: Socket, data: { tenantId: string }) {
    client.join(`tenant:${data.tenantId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(client: Socket, data: {
    tenantId: string;
    message: string;
    userId: string;
  }) {
    // Guardar mensaje en BD
    const chatMessage = await this.prisma.platformchatmessage.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        message: data.message,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    // Emitir a todos en la sala del tenant
    this.server.to(`tenant:${data.tenantId}`).emit('new-message', chatMessage);

    return { success: true, data: chatMessage };
  }

  @SubscribeMessage('typing')
  async handleTyping(client: Socket, data: { tenantId: string; userId: string; isTyping: boolean }) {
    client.to(`tenant:${data.tenantId}`).emit('user-typing', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }
}
```

**Schema Prisma:**

```prisma
model PlatformChatMessage {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  message   String
  createdAt DateTime @default(now())
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([tenantId])
  @@index([createdAt])
  @@map("PlatformChatMessage")
}

// Modificar User
model User {
  // ... campos existentes
  platformChatMessages PlatformChatMessage[]
}
```

---

### 12. Sistema de Leads (CRM)

**Archivo:** `apps/api/src/modules/platform/leads/leads.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async createLead(data: {
    name: string;
    email: string;
    phone?: string;
    source: string;
    interest?: string;
    notes?: string;
    conversationId?: string;
  }) {
    const lead = await this.prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source,
        interest: data.interest,
        notes: data.notes,
        conversationId: data.conversationId,
        status: 'NEW',
        stage: 'LEAD_CAPTURED',
      },
    });

    return { success: true, data: lead };
  }

  async updateLeadStage(leadId: string, stage: string) {
    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { stage, updatedAt: new Date() },
    });

    return { success: true, data: lead };
  }

  async addNote(leadId: string, data: { userId: string; note: string }) {
    const note = await this.prisma.leadnote.create({
      data: {
        leadId,
        userId: data.userId,
        note: data.note,
      },
    });

    return { success: true, data: note };
  }

  async getPipeline() {
    const leads = await this.prisma.lead.findMany({
      where: { status: { not: 'LOST' } },
      include: {
        assignedTo: { select: { id: true, email: true, name: true } },
        _count: { select: { notes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Agrupar por stage
    const pipeline = {
      LEAD_CAPTURED: leads.filter(l => l.stage === 'LEAD_CAPTURED'),
      CONTACTED: leads.filter(l => l.stage === 'CONTACTED'),
      QUALIFIED: leads.filter(l => l.stage === 'QUALIFIED'),
      DEMO: leads.filter(l => l.stage === 'DEMO'),
      PROPOSAL: leads.filter(l => l.stage === 'PROPOSAL'),
      NEGOTIATION: leads.filter(l => l.stage === 'NEGOTIATION'),
      CLOSED_WON: leads.filter(l => l.stage === 'CLOSED_WON'),
    };

    return { success: true, data: pipeline };
  }
}
```

**Schema Prisma:**

```prisma
model Lead {
  id            String   @id @default(cuid())
  name          String
  email         String
  phone         String?
  source        String   // WHATSAPP, WEBCHAT, LANDING, MANUAL, etc.
  interest      String?  // Plan de interés
  status        String   // NEW, CONTACTED, QUALIFIED, OPPORTUNITY, CUSTOMER, LOST
  stage         String   // LEAD_CAPTURED, CONTACTED, QUALIFIED, DEMO, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
  assignedToId  String?
  conversationId String?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  assignedTo    User?    @relation(fields: [assignedToId], references: [id])
  leadNotes     LeadNote[]
  
  @@index([status])
  @@index([stage])
  @@index([assignedToId])
  @@index([source])
  @@map("Lead")
}

model LeadNote {
  id        String   @id @default(cuid())
  leadId    String
  userId    String
  note      String
  createdAt DateTime @default(now())
  
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([leadId])
  @@map("LeadNote")
}

// Modificar User
model User {
  // ... campos existentes
  assignedLeads Lead[]
  leadNotes     LeadNote[]
}
```

---

### 13. Integración con N8N para Flujos

**Archivo:** `apps/api/src/modules/platform/n8n-flows/platform-n8n.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PlatformN8NService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async createFlow(data: {
    name: string;
    description?: string;
    workflow: any; // JSON del workflow de N8N
    category: string;
  }) {
    // Crear flow en BD
    const flow = await this.prisma.platformn8nflow.create({
      data: {
        name: data.name,
        description: data.description,
        workflow: data.workflow,
        category: data.category,
        isActive: false,
      },
    });

    return { success: true, data: flow };
  }

  async activateFlow(flowId: string) {
    const flow = await this.prisma.platformn8nflow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    // Activar flow en N8N
    const n8nUrl = process.env.N8N_URL;
    const n8nApiKey = process.env.N8N_API_KEY;

    try {
      const response = await this.httpService.post(
        `${n8nUrl}/api/v1/workflows`,
        {
          name: flow.name,
          nodes: flow.workflow.nodes,
          connections: flow.workflow.connections,
          active: true,
        },
        {
          headers: {
            'X-N8N-API-KEY': n8nApiKey,
          },
        },
      ).toPromise();

      // Actualizar flow en BD
      await this.prisma.platformn8nflow.update({
        where: { id: flowId },
        data: {
          isActive: true,
          n8nWorkflowId: response.data.id,
        },
      });

      return { success: true, data: flow };
    } catch (error) {
      throw new BadRequestException('Failed to activate flow in N8N');
    }
  }

  async getFlowExecutionLogs(flowId: string) {
    const flow = await this.prisma.platformn8nflow.findUnique({
      where: { id: flowId },
    });

    if (!flow || !flow.n8nWorkflowId) {
      throw new NotFoundException('Flow not found or not activated');
    }

    // Obtener logs de N8N
    const n8nUrl = process.env.N8N_URL;
    const n8nApiKey = process.env.N8N_API_KEY;

    const response = await this.httpService.get(
      `${n8nUrl}/api/v1/executions`,
      {
        params: {
          workflowId: flow.n8nWorkflowId,
        },
        headers: {
          'X-N8N-API-KEY': n8nApiKey,
        },
      },
    ).toPromise();

    return { success: true, data: response.data };
  }
}
```

**Schema Prisma:**

```prisma
model PlatformN8NFlow {
  id            String   @id @default(cuid())
  name          String
  description   String?
  workflow      Json     // Workflow completo de N8N
  category      String   // ONBOARDING, NOTIFICATIONS, LEADS, REPORTS, OPERATIONS
  isActive      Boolean  @default(false)
  n8nWorkflowId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([category])
  @@index([isActive])
  @@map("PlatformN8NFlow")
}
```

---

## Testing

### Tests Unitarios

**Archivo:** `apps/api/src/modules/platform/platform.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from './platform.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            // ... más mocks
          },
        },
      ],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGlobalMetrics', () => {
    it('should return global metrics', async () => {
      // Test implementation
    });
  });

  // Más tests...
});
```

---

## Seguridad y Validaciones

### Validaciones Obligatorias

1. **Autenticación:**
   - Todos los endpoints requieren JWT válido
   - Verificación de expiración del token

2. **Autorización:**
   - Verificación de `platformRole = PLATFORM_OWNER` en cada request
   - No confiar en validación solo en frontend

3. **Validación de Datos:**
   - Validar DTOs con class-validator
   - Validar unicidad de slugs
   - Validar existencia de recursos antes de operar

4. **Rate Limiting:**
   - Aplicar rate limiting a endpoints administrativos
   - Límites más estrictos que endpoints normales

5. **Auditoría:**
   - Registrar todas las acciones administrativas
   - Incluir IP y user agent en logs
   - No registrar datos sensibles (passwords, tokens)

---

## Notas de Implementación

### Fase 1: Fundamentos (MVP)
1. Sistema de roles de plataforma (PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT)
2. Guards y decorators
3. Endpoints básicos (métricas, listar tenants)
4. UI básica del dashboard
5. Gestión básica de facturación

### Fase 2: Gestión Completa
1. CRUD completo de tenants
2. Gestión avanzada de facturación
3. Configuración de tenants
4. Sistema de auditoría
5. Gestión de planes
6. UI completa

### Fase 3: Multi-Instancia y Regiones
1. Sistema de multi-instancia
2. Gestión de regiones de datos
3. Migración de datos entre regiones
4. Validación de cumplimiento legal
5. UI para gestión de instancias

### Fase 4: Soporte y Comunicación
1. Sistema de tickets de soporte
2. Chat en vivo con clientes (WebSocket)
3. Integración tickets-chat
4. Automatización de tickets
5. UI para tickets y chat

### Fase 5: Onboarding y Automatización
1. Flujos de onboarding automatizados
2. Personalización de flujos
3. Integración con N8N
4. Seguimiento de onboarding
5. UI para gestión de flujos

### Fase 6: Operaciones Propias
1. Tenant propio del SaaS
2. Agentes y canales propios
3. CRM de leads integrado
4. Pipeline de ventas
5. Flujos N8N para operaciones
6. UI para operaciones propias

### Fase 7: Optimización y Mejoras
1. Caché de métricas
2. Background jobs para agregaciones
3. Exportación de reportes
4. Optimización de performance
5. Analytics avanzados
6. Mejoras de UI/UX

---

## Referencias

- PRD-46: Panel de Administración de Plataforma
- AI-SPEC-03: Multitenancy, RBAC y Privacidad
- AI-SPEC-08: Integración Stripe Completa
- AI-SPEC-09: Sistema de Invitaciones y Gestión de Equipo

---

**Documento creado:** 2025-01-XX  
**Última actualización:** 2025-01-XX  
**Autor:** Sistema de Documentación
