/**
 * Interfaz base para providers de calendarios
 */

export interface CalendarCredentials {
  [key: string]: unknown;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendeeEmail?: string;
  attendeeName?: string;
}

export interface CalendarProviderInterface {
  /**
   * Valida las credenciales del proveedor
   */
  validateCredentials(credentials: CalendarCredentials): Promise<boolean>;

  /**
   * Obtiene la disponibilidad en un rango de fechas
   */
  getAvailability(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    timezone?: string,
  ): Promise<TimeSlot[]>;

  /**
   * Crea un evento en el calendario
   */
  createEvent(
    credentials: CalendarCredentials,
    event: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      attendeeEmail?: string;
      attendeeName?: string;
    },
  ): Promise<CalendarEvent>;

  /**
   * Cancela un evento
   */
  cancelEvent(credentials: CalendarCredentials, eventId: string): Promise<boolean>;

  /**
   * Obtiene un evento por ID
   */
  getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null>;

  /**
   * Lista eventos en un rango de fechas
   */
  listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]>;
}

/**
 * Clase base abstracta para providers de calendarios
 */
export abstract class BaseCalendarProvider implements CalendarProviderInterface {
  abstract validateCredentials(credentials: CalendarCredentials): Promise<boolean>;
  abstract getAvailability(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
    timezone?: string,
  ): Promise<TimeSlot[]>;
  abstract createEvent(
    credentials: CalendarCredentials,
    event: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      attendeeEmail?: string;
      attendeeName?: string;
    },
  ): Promise<CalendarEvent>;
  abstract cancelEvent(credentials: CalendarCredentials, eventId: string): Promise<boolean>;
  abstract getEvent(credentials: CalendarCredentials, eventId: string): Promise<CalendarEvent | null>;
  abstract listEvents(
    credentials: CalendarCredentials,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]>;
}

