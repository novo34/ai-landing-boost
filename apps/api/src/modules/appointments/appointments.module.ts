import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentReminderSchedulerService } from './services/appointment-reminder-scheduler.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    CalendarModule,
    forwardRef(() => WhatsAppModule),
    N8nIntegrationModule,
    NotificationsModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentReminderSchedulerService,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

