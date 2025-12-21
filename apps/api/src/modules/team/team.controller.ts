import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { ChangeRoleDto } from './dto/change-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

/**
 * CRÍTICO: Este controlador usa @CurrentTenant() en lugar de @Param('tenantId')
 * para prevenir manipulación de tenantId desde la URL.
 * El TenantContextGuard valida que el usuario tiene acceso al tenant.
 */
@Controller('team')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get('members')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getMembers(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { userId: string; email: string; name?: string },
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.teamService.getMembers(tenant.id, user.userId);
  }

  @Post('members/:userId/role')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async changeRole(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: { userId: string; email: string; name?: string },
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.teamService.changeMemberRole(tenant.id, userId, dto.role, user.userId);
  }

  @Delete('members/:userId')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('userId') userId: string,
    @CurrentUser() user: { userId: string; email: string; name?: string },
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.teamService.removeMember(tenant.id, userId, user.userId);
  }

  @Post('transfer-ownership')
  @Roles($Enums.tenantmembership_role.OWNER)
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: { userId: string; email: string; name?: string },
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.teamService.transferOwnership(tenant.id, dto.newOwnerId, user.userId, dto.confirmationCode);
  }
}

