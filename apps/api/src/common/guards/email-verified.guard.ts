import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard que verifica que el usuario tenga su email verificado
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.unauthorized',
      });
    }

    // Obtener usuario con emailVerified
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { emailVerified: true },
    });

    if (!dbUser) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.user_not_found',
      });
    }

    if (!dbUser.emailVerified) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.email_not_verified',
        message: 'Email verification required to access this resource',
      });
    }

    return true;
  }
}
