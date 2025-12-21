import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalComProvider } from './providers/cal-com.provider';
import { PrismaModule } from '../../prisma/prisma.module';

// Conditionally import GoogleCalendarProvider only if googleapis is available
// Use optional provider injection to avoid startup errors
const providers: any[] = [CalendarService, CalComProvider];

// Try to load GoogleCalendarProvider, but don't fail if it's not available
try {
  // Check if googleapis can be resolved
  require.resolve('googleapis');
  // If resolved, try to import the provider
  const { GoogleCalendarProvider } = require('./providers/google-calendar.provider');
  providers.push({
    provide: 'GoogleCalendarProvider',
    useClass: GoogleCalendarProvider,
  });
} catch (error) {
  // If googleapis is not available, provide a null implementation
  console.warn('[CalendarModule] Google Calendar provider disabled: googleapis module not available');
  providers.push({
    provide: 'GoogleCalendarProvider',
    useValue: null,
  });
}

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers,
  exports: [CalendarService],
})
export class CalendarModule {}

