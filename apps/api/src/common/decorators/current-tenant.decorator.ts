import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para obtener el tenantId del request
 * Requiere que TenantContextGuard esté aplicado
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      id: request.tenantId,
      role: request.tenantRole,
    };
  },
);







