import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseCalendarProvider, CalendarCredentials, TimeSlot, CalendarEvent } from './base-calendar.provider';
import axios, { AxiosInstance } from 'axios';

/**
 * Provider para Cal.com
 * 
 * Documentación: https://cal.com/docs/api
 */
@Injectable()
export class CalComProvider extends BaseCalendarProvider {
  private readonly logger = new Logger(CalComProvider.name);

  /**
   * Crea una instancia de Axios configurada para Cal.com
   */
  private createClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: 'https://api.cal.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Valida las credenciales de Cal.com
   */
  async validateCredentials(credentials: CalendarCredentials): Promise<boolean> {
    try {
      const apiKey = credentials.apiKey as string;
      if (!apiKey) {
        return false;
      }

      const client = this.createClient(apiKey);
      await client.get('/me');

      return true;
    } catch (error) {
      this.logger.warn(`Cal.com credentials validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Obtiene la disponibilidad en Cal.com
   */
  async getAvailability(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    timezone?: string,
  ): Promise<TimeSlot[]> {
    try {
      const apiKey = credentials.apiKey as string;
      const client = this.createClient(apiKey);

      // Cal.com requiere un eventTypeId o username
      const eventTypeId = credentials.eventTypeId as string;
      const username = credentials.username as string;

      if (!eventTypeId && !username) {
        throw new BadRequestException('Cal.com requires eventTypeId or username');
      }

      const response = await client.get('/slots/date-range', {
        params: {
          eventTypeId: eventTypeId || undefined,
          username: username || undefined,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          timeZone: timezone || 'UTC',
        },
      });

      const slots: TimeSlot[] = (response.data.slots || []).map((slot: { time: string }) => ({
        start: new Date(slot.time),
        end: new Date(new Date(slot.time).getTime() + (credentials.duration as number || 30) * 60000),
      }));

      return slots;
    } catch (error) {
      this.logger.error(`Error getting Cal.com availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.cal_com_availability_failed',
        message: 'Failed to get availability from Cal.com',
      });
    }
  }

  /**
   * Crea un evento en Cal.com
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
      const apiKey = credentials.apiKey as string;
      const client = this.createClient(apiKey);

      const response = await client.post('/bookings', {
        eventTypeId: credentials.eventTypeId as string,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        responses: {
          name: event.attendeeName || 'Guest',
          email: event.attendeeEmail || '',
          notes: event.description || '',
        },
      });

      return {
        id: response.data.uid,
        title: event.title,
        start: new Date(response.data.startTime),
        end: new Date(response.data.endTime),
        description: event.description,
        attendeeEmail: event.attendeeEmail,
        attendeeName: event.attendeeName,
      };
    } catch (error) {
      this.logger.error(`Error creating Cal.com event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.cal_com_event_creation_failed',
        message: 'Failed to create event in Cal.com',
      });
    }
  }

  /**
   * Cancela un evento en Cal.com
   */
  async cancelEvent(credentials: CalendarCredentials, eventId: string): Promise<boolean> {
    try {
      const apiKey = credentials.apiKey as string;
      const client = this.createClient(apiKey);

      await client.delete(`/bookings/${eventId}`, {
        data: {
          reason: 'Cancelled by system',
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error cancelling Cal.com event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Obtiene un evento de Cal.com por ID
   */
  async getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null> {
    try {
      const apiKey = credentials.apiKey as string;
      const client = this.createClient(apiKey);

      const response = await client.get(`/bookings/${eventId}`);

      return {
        id: response.data.uid,
        title: response.data.title || 'Event',
        start: new Date(response.data.startTime),
        end: new Date(response.data.endTime),
        description: response.data.description,
        attendeeEmail: response.data.attendees?.[0]?.email,
        attendeeName: response.data.attendees?.[0]?.name,
      };
    } catch (error) {
      this.logger.warn(`Error getting Cal.com event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Lista eventos de Cal.com en un rango de fechas
   */
  async listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    try {
      const apiKey = credentials.apiKey as string;
      const client = this.createClient(apiKey);

      const response = await client.get('/bookings', {
        params: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return (response.data.bookings || []).map((booking: {
        uid: string;
        title?: string;
        startTime: string;
        endTime: string;
        description?: string;
        attendees?: Array<{ email?: string; name?: string }>;
      }) => ({
        id: booking.uid,
        title: booking.title || 'Event',
        start: new Date(booking.startTime),
        end: new Date(booking.endTime),
        description: booking.description,
        attendeeEmail: booking.attendees?.[0]?.email,
        attendeeName: booking.attendees?.[0]?.name,
      }));
    } catch (error) {
      this.logger.error(`Error listing Cal.com events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }
}

