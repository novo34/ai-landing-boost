import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { SubscriptionStatusGuard } from './guards/subscription-status.guard';
import { TenantContextGuard } from './guards/tenant-context.guard';
import { AuditLoggerService } from './audit/audit-logger.service';

/**
 * Módulo común que exporta guards compartidos y servicios comunes
 * Los guards y servicios se pueden usar en cualquier módulo sin necesidad de importarlos
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    EmailVerifiedGuard,
    SubscriptionStatusGuard,
    TenantContextGuard,
    AuditLoggerService,
  ],
  exports: [
    EmailVerifiedGuard,
    SubscriptionStatusGuard,
    TenantContextGuard,
    AuditLoggerService,
  ],
})
export class CommonModule {}
