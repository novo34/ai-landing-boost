import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      // Agregar middleware de performance
      this.$use(this.createPerformanceMiddleware());
      
      // Conectar a la base de datos
      await this.$connect();
      this.logger.log('✅ Prisma Client connected to database');

      // Verificar que la conexión funciona
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection verified');

      // Verificar que Prisma Client está generado correctamente
      // Intentar acceder a un modelo para verificar tipos
      await this.user.findFirst({ take: 1 });
      this.logger.log('✅ Prisma Client types verified');
    } catch (error) {
      this.logger.error('❌ Prisma connection failed:', error);
      this.logger.error('\n💡 Troubleshooting steps:');
      this.logger.error('   1. Check DATABASE_URL in .env file');
      this.logger.error('   2. Run: pnpm prisma generate');
      this.logger.error('   3. Run: pnpm prisma migrate deploy');
      this.logger.error('   4. Verify MySQL is running and accessible\n');
      throw error;
    }
  }

  /**
   * Middleware de Prisma para medir tiempo de queries
   * Solo activo en development
   */
  private createPerformanceMiddleware(): Prisma.Middleware {
    return async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<any>,
    ) => {
      if (process.env.NODE_ENV !== 'development') {
        return next(params);
      }

      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;

      // Log queries lentas (>50ms)
      if (duration > 50) {
        const model = params.model || 'unknown';
        const action = params.action;
        this.logger.warn(
          `[PERF][PRISMA] ${model}.${action} ... ${duration}ms`,
        );
      }

      return result;
    };
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected');
  }
}

