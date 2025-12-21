import { Controller, Get, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  memberships?: unknown[];
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Throttle({ short: { limit: 60, ttl: 60000 } }) // 60 requests por minuto (aumentado para evitar rate limiting después del login)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findMe(user.userId);
  }

  /**
   * Obtiene las identidades SSO del usuario actual
   */
  @Get('me/identities')
  @UseGuards(JwtAuthGuard)
  async getMyIdentities(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserIdentities(user.userId);
  }

  /**
   * Elimina una identidad SSO del usuario actual
   */
  @Delete('me/identities/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteIdentity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') identityId: string,
  ) {
    return this.usersService.deleteUserIdentity(user.userId, identityId);
  }
}

