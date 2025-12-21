import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * TenantLoggingMiddleware
 * 
 * Middleware que inyecta tenantId en el contexto de logging para todos los requests.
 * Esto asegura que todos los logs incluyen información de tenant para facilitar auditoría.
 * 
 * Uso:
 * En app.module.ts o main.ts:
 * app.use(TenantLoggingMiddleware);
 */
@Injectable()
export class TenantLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Inyectar tenantId en contexto de request para logging
    // tenantId se establece en TenantContextGuard
    const tenantId = (req as any).tenantId || 'none';
    const userId = (req as any).user?.userId || 'anonymous';

    // Agregar contexto de logging al request
    (req as any).logContext = {
      tenantId,
      userId,
      endpoint: req.url,
      method: req.method,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Log estructurado en desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug('Request context', {
        tenantId,
        userId,
        endpoint: req.url,
        method: req.method,
      });
    }

    next();
  }
}
