import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseCalendarProvider, CalendarCredentials, TimeSlot, CalendarEvent } from './base-calendar.provider';

// Lazy load googleapis to handle module resolution issues
// Note: googleapis may not be built, so we use a try-catch approach
let googleapisModule: any = null;
function getGoogleApis() {
  if (!googleapisModule) {
    try {
      // Try standard require first
      googleapisModule = require('googleapis');
      // Extract google object if the module exports it directly
      googleapisModule = googleapisModule.google || googleapisModule;
    } catch (error) {
      // If require fails, the module might not be properly installed
      // This is acceptable since Google Calendar is optional
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[GoogleCalendarProvider] Failed to load googleapis: ${errorMsg}`);
      throw new BadRequestException(
        'Google APIs module not available. Google Calendar features are disabled. ' +
        'Please install googleapis package if you need Google Calendar integration.'
      );
    }
  }
  return googleapisModule;
}

/**
 * Provider para Google Calendar
 * 
 * Requiere OAuth2 credentials configuradas
 */
@Injectable()
export class GoogleCalendarProvider extends BaseCalendarProvider {
  private readonly logger = new Logger(GoogleCalendarProvider.name);

  /**
   * Crea un cliente de Google Calendar autenticado
   */
  private async createClient(credentials: CalendarCredentials) {
    let googleApis: any;
    try {
      googleApis = getGoogleApis();
    } catch (error) {
      throw new BadRequestException(
        'Google Calendar is not available. The googleapis package is not properly installed.'
      );
    }
    
    if (!googleApis || !googleApis.auth) {
      throw new BadRequestException('Google APIs module is not properly loaded');
    }
    
    const oauth2Client = new googleApis.auth.OAuth2(
      credentials.clientId as string,
      credentials.clientSecret as string,
      credentials.redirectUri as string,
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken as string,
      refresh_token: credentials.refreshToken as string,
    });

    return googleApis.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Valida las credenciales de Google Calendar
   */
  async validateCredentials(credentials: CalendarCredentials): Promise<boolean> {
    try {
      const calendar = await this.createClient(credentials);
      await calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error) {
      this.logger.warn(`Google Calendar credentials validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Obtiene la disponibilidad en Google Calendar
   */
  async getAvailability(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    timezone?: string,
  ): Promise<TimeSlot[]> {
    try {
      const calendar = await this.createClient(credentials);
      const calendarId = (credentials.calendarId as string) || 'primary';

      // Obtener eventos existentes
      const eventsResponse = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const busySlots: TimeSlot[] = (eventsResponse.data.items || []).map((event) => {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        return {
          start: new Date(start || ''),
          end: new Date(end || ''),
        };
      });

      // Calcular slots disponibles (simplificado)
      // En producción, esto debería considerar horarios de trabajo, duración de citas, etc.
      const availableSlots: TimeSlot[] = [];
      const duration = (credentials.duration as number) || 30; // minutos
      const current = new Date(startDate);

      while (current < endDate) {
        const slotEnd = new Date(current.getTime() + duration * 60000);
        const isBusy = busySlots.some(
          (busy) =>
            (current >= busy.start && current < busy.end) ||
            (slotEnd > busy.start && slotEnd <= busy.end) ||
            (current <= busy.start && slotEnd >= busy.end),
        );

        if (!isBusy) {
          availableSlots.push({
            start: new Date(current),
            end: new Date(slotEnd),
          });
        }

        current.setMinutes(current.getMinutes() + duration);
      }

      return availableSlots;
    } catch (error) {
      this.logger.error(`Error getting Google Calendar availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.google_availability_failed',
        message: 'Failed to get availability from Google Calendar',
      });
    }
  }

  /**
   * Crea un evento en Google Calendar
   */
  async createEvent(
    credentials: CalendarCredentials,
    event: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      attendeeEmail?: string;
      attendeeName?: string;
    },
  ): Promise<CalendarEvent> {
    try {
      const calendar = await this.createClient(credentials);
      const calendarId = (credentials.calendarId as string) || 'primary';

      const eventData: {
        summary: string;
        description?: string;
        start: { dateTime: string; timeZone?: string };
        end: { dateTime: string; timeZone?: string };
        attendees?: Array<{ email: string; displayName?: string }>;
      } = {
        summary: event.title,
        start: {
          dateTime: event.start.toISOString(),
        },
        end: {
          dateTime: event.end.toISOString(),
        },
      };

      if (event.description) {
        eventData.description = event.description;
      }

      if (event.attendeeEmail) {
        eventData.attendees = [
          {
            email: event.attendeeEmail,
            displayName: event.attendeeName,
          },
        ];
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });

      return {
        id: response.data.id || '',
        title: response.data.summary || event.title,
        start: new Date(response.data.start?.dateTime || event.start),
        end: new Date(response.data.end?.dateTime || event.end),
        description: response.data.description || event.description,
        attendeeEmail: event.attendeeEmail,
        attendeeName: event.attendeeName,
      };
    } catch (error) {
      this.logger.error(`Error creating Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.google_event_creation_failed',
        message: 'Failed to create event in Google Calendar',
      });
    }
  }

  /**
   * Cancela un evento en Google Calendar
   */
  async cancelEvent(credentials: CalendarCredentials, eventId: string): Promise<boolean> {
    try {
      const calendar = await this.createClient(credentials);
      const calendarId = (credentials.calendarId as string) || 'primary';

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return true;
    } catch (error) {
      this.logger.error(`Error cancelling Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Obtiene un evento de Google Calendar por ID
   */
  async getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null> {
    try {
      const calendar = await this.createClient(credentials);
      const calendarId = (credentials.calendarId as string) || 'primary';

      const response = await calendar.events.get({
        calendarId,
        eventId,
      });

      return {
        id: response.data.id || '',
        title: response.data.summary || 'Event',
        start: new Date(response.data.start?.dateTime || ''),
        end: new Date(response.data.end?.dateTime || ''),
        description: response.data.description,
        attendeeEmail: response.data.attendees?.[0]?.email,
        attendeeName: response.data.attendees?.[0]?.displayName,
      };
    } catch (error) {
      this.logger.warn(`Error getting Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Lista eventos de Google Calendar en un rango de fechas
   */
  async listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      const calendar = await this.createClient(credentials);
      const calendarId = (credentials.calendarId as string) || 'primary';

      const response = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map((event) => ({
        id: event.id || '',
        title: event.summary || 'Event',
        start: new Date(event.start?.dateTime || ''),
        end: new Date(event.end?.dateTime || ''),
        description: event.description,
        attendeeEmail: event.attendees?.[0]?.email,
        attendeeName: event.attendees?.[0]?.displayName,
      }));
    } catch (error) {
      this.logger.error(`Error listing Google Calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }
}

