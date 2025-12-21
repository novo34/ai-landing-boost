# AI-SPEC-09: Sistema de Invitaciones y Gestión de Equipo

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-09  
> **Prioridad:** 🔴 CRÍTICA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── invitations/
│   │   ├── invitations.module.ts             [MODIFICAR]
│   │   ├── invitations.service.ts            [MODIFICAR]
│   │   └── invitations.controller.ts         [MODIFICAR]
│   └── team/
│       ├── team.module.ts                    [CREAR]
│       ├── team.service.ts                   [CREAR]
│       └── team.controller.ts                [CREAR]
```

---

## Archivos a Crear/Modificar

### 1. Crear Team Service

**Archivo:** `apps/api/src/modules/team/team.service.ts`

```typescript
import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantRole } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getMembers(tenantId: string, requesterId: string) {
    // Verificar permisos
    const requesterMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      throw new ForbiddenException('Only OWNER or ADMIN can view team members');
    }

    // Obtener miembros activos
    const members = await this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Obtener invitaciones pendientes
    const pendingInvitations = await this.prisma.teamInvitation.findMany({
      where: {
        tenantId,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        members: members.map(m => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.createdAt,
          status: 'ACTIVE',
        })),
        pendingInvitations: pendingInvitations.map(i => ({
          email: i.email,
          role: i.role,
          invitedBy: i.inviter.name || i.inviter.email,
          invitedAt: i.createdAt,
          expiresAt: i.expiresAt,
        })),
      },
    };
  }

  async changeMemberRole(tenantId: string, userId: string, newRole: TenantRole, requesterId: string) {
    // Verificar permisos del requester
    const requesterMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('Requester is not a member of this tenant');
    }

    // OWNER puede cambiar cualquier rol
    // ADMIN solo puede cambiar AGENT y VIEWER
    if (requesterMembership.role === 'ADMIN') {
      const targetMembership = await this.prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (!targetMembership) {
        throw new NotFoundException('Member not found');
      }

      if (['OWNER', 'ADMIN'].includes(targetMembership.role)) {
        throw new ForbiddenException('ADMIN cannot change role of OWNER or ADMIN');
      }
    }

    // No permitir cambiar rol de OWNER a menos que sea transferencia
    if (newRole !== 'OWNER' && requesterId === userId) {
      const currentMembership = await this.prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (currentMembership?.role === 'OWNER') {
        throw new BadRequestException('OWNER cannot change their own role. Use transfer ownership instead.');
      }
    }

    // Actualizar rol
    await this.prisma.tenantMembership.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: { role: newRole },
    });

    return {
      success: true,
      message: 'Role updated successfully',
    };
  }

  async removeMember(tenantId: string, userId: string, requesterId: string) {
    // Verificar permisos
    const requesterMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      throw new ForbiddenException('Only OWNER or ADMIN can remove members');
    }

    // OWNER no puede remover a sí mismo
    if (requesterId === userId) {
      throw new BadRequestException('Cannot remove yourself. Transfer ownership first.');
    }

    // ADMIN no puede remover a OWNER
    if (requesterMembership.role === 'ADMIN') {
      const targetMembership = await this.prisma.tenantMembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (targetMembership?.role === 'OWNER') {
        throw new ForbiddenException('ADMIN cannot remove OWNER');
      }
    }

    // Eliminar membresía
    await this.prisma.tenantMembership.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  async transferOwnership(tenantId: string, newOwnerId: string, requesterId: string, confirmationCode?: string) {
    // Verificar que requester es OWNER
    const requesterMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (requesterMembership?.role !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can transfer ownership');
    }

    // Verificar que nuevo owner es miembro y es ADMIN
    const newOwnerMembership = await this.prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: newOwnerId,
          tenantId,
        },
      },
    });

    if (!newOwnerMembership) {
      throw new NotFoundException('New owner is not a member of this tenant');
    }

    if (newOwnerMembership.role !== 'ADMIN') {
      throw new BadRequestException('New owner must be an ADMIN');
    }

    // TODO: Validar confirmationCode si se implementa doble confirmación

    // Transferir ownership (transacción)
    await this.prisma.$transaction([
      // Cambiar rol del OWNER actual a ADMIN
      this.prisma.tenantMembership.update({
        where: {
          userId_tenantId: {
            userId: requesterId,
            tenantId,
          },
        },
        data: { role: 'ADMIN' },
      }),
      // Cambiar rol del nuevo OWNER
      this.prisma.tenantMembership.update({
        where: {
          userId_tenantId: {
            userId: newOwnerId,
            tenantId,
          },
        },
        data: { role: 'OWNER' },
      }),
    ]);

    return {
      success: true,
      message: 'Ownership transferred successfully',
    };
  }
}
```

---

### 2. Crear Team Controller

**Archivo:** `apps/api/src/modules/team/team.controller.ts`

```typescript
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { TenantRole } from '@prisma/client';
import { ChangeRoleDto, TransferOwnershipDto } from './dto';

@Controller('tenants/:tenantId/team')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get('members')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async getMembers(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamService.getMembers(tenantId, user.id);
  }

  @Post('members/:userId/role')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async changeRole(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.teamService.changeMemberRole(tenantId, userId, dto.role, user.id);
  }

  @Delete('members/:userId')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async removeMember(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamService.removeMember(tenantId, userId, user.id);
  }

  @Post('transfer-ownership')
  @Roles(TenantRole.OWNER)
  async transferOwnership(
    @Param('tenantId') tenantId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: any,
  ) {
    return this.teamService.transferOwnership(tenantId, dto.newOwnerId, user.id, dto.confirmationCode);
  }
}
```

---

### 3. Crear DTOs

**Archivo:** `apps/api/src/modules/team/dto/change-role.dto.ts`

```typescript
import { IsEnum } from 'class-validator';
import { TenantRole } from '@prisma/client';

export class ChangeRoleDto {
  @IsEnum(TenantRole)
  role: TenantRole;
}
```

**Archivo:** `apps/api/src/modules/team/dto/transfer-ownership.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  @IsNotEmpty()
  newOwnerId: string;

  @IsString()
  @IsOptional()
  confirmationCode?: string;
}
```

---

## Tablas Prisma

No se requieren cambios. Usar modelos existentes:
- `TenantMembership`
- `TeamInvitation` (de PRD-07)

---

## DTOs

Ver sección 3 arriba.

---

## Controllers

Ver sección 2 arriba.

---

## Services

Ver sección 1 arriba.

---

## Guards

Usar guards existentes:
- `JwtAuthGuard`
- `TenantContextGuard`
- `RbacGuard` con decorador `@Roles()`

---

## Validaciones

- **Permisos:** Verificar siempre en backend
- **OWNER:** No puede cambiar su propio rol (excepto transferencia)
- **ADMIN:** No puede cambiar/remover OWNER u otro ADMIN
- **Transferencia:** Nuevo owner debe ser ADMIN

---

## Errores Esperados

```typescript
- 'team.only_owner_admin_can_view'
- 'team.only_owner_can_change_role'
- 'team.cannot_change_owner_role'
- 'team.cannot_remove_yourself'
- 'team.admin_cannot_remove_owner'
- 'team.member_not_found'
- 'team.new_owner_must_be_admin'
```

---

## Test Plan

### Unit Tests

1. **TeamService:**
   - `getMembers` valida permisos
   - `changeMemberRole` valida permisos y reglas
   - `removeMember` valida permisos y reglas
   - `transferOwnership` valida que requester es OWNER y destino es ADMIN

### Integration Tests

1. **Flujo completo cambio de rol:**
   - OWNER cambia rol de ADMIN a AGENT
   - Verificar actualización en BD
   - Verificar que ADMIN no puede cambiar OWNER

2. **Flujo completo transferencia:**
   - OWNER transfiere a ADMIN
   - Verificar que roles se intercambian
   - Verificar que antiguo OWNER ahora es ADMIN

---

## Checklist Final

- [ ] TeamService implementado
- [ ] TeamController implementado
- [ ] DTOs creados
- [ ] TeamModule creado e importado en AppModule
- [ ] Validaciones de permisos implementadas
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Frontend con UI de gestión de equipo
- [ ] Frontend con modales de confirmación
- [ ] Documentación de API actualizada

---

## Notas de Implementación

- **Transacciones:** Usar `prisma.$transaction` para transferencia de ownership
- **Notificaciones:** Enviar emails para cambios importantes (opcional)
- **Logs:** Registrar todos los cambios de roles y remociones
- **UI/UX:** Mostrar confirmaciones claras para acciones destructivas

---

**Última actualización:** 2025-01-XX







