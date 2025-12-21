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
