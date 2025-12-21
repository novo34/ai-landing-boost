import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

/**
 * CRÍTICO: Este controlador usa @CurrentTenant() en lugar de @Param('tenantId')
 * para prevenir manipulación de tenantId desde la URL.
 * El TenantContextGuard valida que el usuario tiene acceso al tenant.
 */
@Controller('invitations')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: any,
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.invitationsService.createInvitation(
      tenant.id,
      dto.email,
      dto.role,
      user.userId,
    );
  }

  @Get()
  @UseGuards(RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async listInvitations(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: any,
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.invitationsService.listInvitations(tenant.id, user.userId);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelInvitation(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // CRÍTICO: Usar tenant.id del guard (validado), NO del parámetro de URL
    return this.invitationsService.cancelInvitation(tenant.id, id, user.userId);
  }
}

@Controller('invitations')
export class PublicInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  @Public()
  async getInvitation(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: any,
  ) {
    return this.invitationsService.acceptInvitation(token, user.userId);
  }

  @Post(':token/reject')
  @Public()
  @HttpCode(HttpStatus.OK)
  async rejectInvitation(@Param('token') token: string) {
    return this.invitationsService.rejectInvitation(token);
  }
}

