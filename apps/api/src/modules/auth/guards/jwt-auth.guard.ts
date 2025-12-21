import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Solo loguear rutas públicas si está habilitado el debug
      if (process.env.DEBUG_AUTH === 'true') {
        const request = context.switchToHttp().getRequest();
        this.logger.debug(
          `✅ Public route accessed: ${request.method} ${request.url}`
        );
      }
      return true;
    }

    // Ruta protegida - solo loguear si está habilitado el debug
    if (process.env.DEBUG_AUTH === 'true') {
      const request = context.switchToHttp().getRequest();
      this.logger.debug(
        `🔒 Protected route accessed: ${request.method} ${request.url}`
      );
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const errorMessage = info?.message || err?.message || 'Authentication failed';
      
      // Solo loguear errores de autenticación si está habilitado el debug
      // Esto evita spam de logs cuando el frontend hace requests sin autenticación
      if (process.env.DEBUG_AUTH === 'true') {
        const request = context.switchToHttp().getRequest();
        this.logger.warn(
          `❌ Authentication failed for ${request.method} ${request.url}: ${errorMessage}`
        );
      }
      
      throw err || new UnauthorizedException({
        success: false,
        error_key: 'auth.unauthorized',
        error_params: { message: errorMessage },
      });
    }

    // Solo loguear autenticaciones exitosas si está habilitado el debug
    if (process.env.DEBUG_AUTH === 'true') {
      this.logger.debug(`✅ Authenticated user: ${user.email || user.userId}`);
    }
    
    return user;
  }
}

