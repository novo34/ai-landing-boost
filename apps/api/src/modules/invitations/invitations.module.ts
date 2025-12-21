import { Module } from '@nestjs/common';
import { InvitationsController, PublicInvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';

@Module({
  imports: [PrismaModule, EmailModule, N8nIntegrationModule],
  controllers: [InvitationsController, PublicInvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}

