import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { createData } from '../../common/prisma/create-data.helper';
import { CreateCalendarIntegrationDto } from './dto/create-calendar-integration.dto';
import { UpdateCalendarIntegrationDto } from './dto/update-calendar-integration.dto';
import { CreateCalendarRuleDto } from './dto/create-calendar-rule.dto';
import { UpdateCalendarRuleDto } from './dto/update-calendar-rule.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { CalComProvider } from './providers/cal-com.provider';
import { EncryptionUtil } from '../whatsapp/utils/encryption.util';
import { $Enums } from '@prisma/client';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private calComProvider: CalComProvider,
    @Optional() @Inject('GoogleCalendarProvider') private googleCalendarProvider: any,
  ) {}

  /**
   * Obtiene todas las integraciones de calendario del tenant
   */
  async getIntegrations(tenantId: string) {
        const integrations = await this.prisma.calendarintegration.findMany({
      where: { tenantId },
      include: {
        agentcalendarrule: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Desencriptar credenciales para mostrar (solo metadata, no credenciales completas)
    const integrationsWithMaskedCredentials = integrations.map((integration) => ({
      ...integration,
      credentials: EncryptionUtil.mask(integration.credentials),
    }));

    return {
      success: true,
      data: integrationsWithMaskedCredentials,
    };
  }

  /**
   * Obtiene una integración específica por ID
   */
  async getIntegrationById(tenantId: string, integrationId: string) {
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: integrationId,
        tenantId,
      },
      include: {
        agentcalendarrule: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
      });
    }

    return {
      success: true,
      data: {
        ...integration,
        credentials: EncryptionUtil.mask(integration.credentials),
      },
    };
  }

  /**
   * Crea una nueva integración de calendario
   */
  async createIntegration(tenantId: string, dto: CreateCalendarIntegrationDto) {
    // Validar credenciales con el provider correspondiente
    const provider = this.getProvider(dto.provider);
    const isValid = await provider.validateCredentials(dto.credentials);

    if (!isValid) {
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.invalid_credentials',
        message: 'Invalid calendar provider credentials',
      });
    }

    // Encriptar credenciales
    const encryptedCredentials = EncryptionUtil.encrypt(
      JSON.stringify(dto.credentials),
    );

        const integration = await this.prisma.calendarintegration.create({
      data: createData({
        tenantId,
        provider: dto.provider,
        credentials: encryptedCredentials,
        status: dto.status || 'ACTIVE',
      }),
    });

    return {
      success: true,
      data: {
        ...integration,
        credentials: EncryptionUtil.mask(integration.credentials),
      },
    };
  }

  /**
   * Actualiza una integración de calendario
   */
  async updateIntegration(
    tenantId: string,
    integrationId: string,
    dto: UpdateCalendarIntegrationDto,
  ) {
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: integrationId,
        tenantId,
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
      });
    }

    // Si se actualizan credenciales, validarlas
    if (dto.credentials) {
      const provider = this.getProvider(integration.provider);
      const isValid = await provider.validateCredentials(dto.credentials);

      if (!isValid) {
        throw new BadRequestException({
          success: false,
          error_key: 'calendar.invalid_credentials',
          message: 'Invalid calendar provider credentials',
        });
      }
    }

    // Encriptar credenciales si se actualizan
    const encryptedCredentials = dto.credentials
      ? EncryptionUtil.encrypt(JSON.stringify(dto.credentials))
      : undefined;

        const updated = await this.prisma.calendarintegration.update({
      where: { id: integrationId },
      data: {
        credentials: encryptedCredentials,
        status: dto.status,
      },
    });

    return {
      success: true,
      data: {
        ...updated,
        credentials: EncryptionUtil.mask(updated.credentials),
      },
    };
  }

  /**
   * Elimina una integración de calendario
   */
  async deleteIntegration(tenantId: string, integrationId: string) {
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: integrationId,
        tenantId,
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
      });
    }

        await this.prisma.calendarintegration.delete({
      where: { id: integrationId },
    });

    return {
      success: true,
      data: { id: integrationId },
    };
  }

  /**
   * Obtiene todas las reglas de calendario del tenant
   */
  async getRules(tenantId: string, agentId?: string) {
    const where: { agent: { tenantId: string }; agentId?: string } = {
      agent: { tenantId },
    };
    if (agentId) {
      where.agentId = agentId;
    }

        const rules = await this.prisma.agentcalendarrule.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        calendarintegration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: rules,
    };
  }

  /**
   * Crea una nueva regla de calendario
   */
  async createRule(tenantId: string, dto: CreateCalendarRuleDto) {
    // Validar que el agente existe y pertenece al tenant
        const agent = await this.prisma.agent.findFirst({
      where: {
        id: dto.agentId,
        tenantId,
      },
    });

    if (!agent) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.agent_not_found',
        message: 'Agent not found or does not belong to tenant',
      });
    }

    // Validar que la integración existe y pertenece al tenant
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: dto.calendarIntegrationId,
        tenantId,
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
        message: 'Calendar integration not found or does not belong to tenant',
      });
    }

        const rule = await this.prisma.agentcalendarrule.create({
      data: createData({
        agentId: dto.agentId,
        calendarIntegrationId: dto.calendarIntegrationId,
        duration: dto.duration,
        availableHours: typeof dto.availableHours === 'string' ? dto.availableHours : JSON.stringify(dto.availableHours),
        availableDays: Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : (dto.availableDays || '[]'),
        bufferMinutes: dto.bufferMinutes || 15,
        cancellationPolicy: dto.cancellationPolicy ? JSON.stringify(dto.cancellationPolicy) : null,
      }),
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        calendarintegration: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    return {
      success: true,
      data: rule,
    };
  }

  /**
   * Actualiza una regla de calendario
   */
  async updateRule(
    tenantId: string,
    ruleId: string,
    dto: UpdateCalendarRuleDto,
  ) {
        const rule = await this.prisma.agentcalendarrule.findFirst({
      where: {
        id: ruleId,
        agent: {
          tenantId,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.rule_not_found',
      });
    }

    // Validar integración si se actualiza
    if (dto.calendarIntegrationId) {
            const integration = await this.prisma.calendarintegration.findFirst({
        where: {
          id: dto.calendarIntegrationId,
          tenantId,
        },
      });

      if (!integration) {
        throw new NotFoundException({
          success: false,
          error_key: 'calendar.integration_not_found',
        });
      }
    }

        const updated = await this.prisma.agentcalendarrule.update({
      where: { id: ruleId },
      data: {
        calendarIntegrationId: dto.calendarIntegrationId,
        duration: dto.duration,
        availableHours: dto.availableHours ? (typeof dto.availableHours === 'string' ? dto.availableHours : JSON.stringify(dto.availableHours)) : undefined,
        availableDays: dto.availableDays ? (Array.isArray(dto.availableDays) ? JSON.stringify(dto.availableDays) : dto.availableDays) : undefined,
        bufferMinutes: dto.bufferMinutes,
        cancellationPolicy: dto.cancellationPolicy ? JSON.stringify(dto.cancellationPolicy) : undefined,
        updatedAt: new Date(),
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        calendarintegration: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Elimina una regla de calendario
   */
  async deleteRule(tenantId: string, ruleId: string) {
        const rule = await this.prisma.agentcalendarrule.findFirst({
      where: {
        id: ruleId,
        agent: {
          tenantId,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.rule_not_found',
      });
    }

        await this.prisma.agentcalendarrule.delete({
      where: { id: ruleId },
    });

    return {
      success: true,
      data: { id: ruleId },
    };
  }

  /**
   * Obtiene la disponibilidad de calendario
   */
  async getAvailability(tenantId: string, dto: GetAvailabilityDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Si se especifica un agente, usar sus reglas
    if (dto.agentId) {
            const rule = await this.prisma.agentcalendarrule.findFirst({
        where: {
          agentId: dto.agentId,
          agent: {
            tenantId,
          },
          calendarIntegrationId: dto.calendarIntegrationId || undefined,
        },
        include: {
          calendarintegration: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!rule) {
        throw new NotFoundException({
          success: false,
          error_key: 'calendar.rule_not_found',
          message: 'No calendar rule found for agent',
        });
      }

      // Desencriptar credenciales
      const decryptedCredentials = JSON.parse(
        EncryptionUtil.decrypt(rule.calendarintegration.credentials),
      );

      // Obtener disponibilidad del provider
      const provider = this.getProvider(rule.calendarintegration.provider);
      const timeSlots = await provider.getAvailability(
        decryptedCredentials,
        startDate,
        endDate,
        dto.timezone,
      );

      // Aplicar filtros de la regla (horarios disponibles, días, etc.)
      const availableHours = typeof rule.availableHours === 'string' 
        ? (JSON.parse(rule.availableHours) as { start: string; end: string })
        : (rule.availableHours as { start: string; end: string });
      const availableDays = typeof rule.availableDays === 'string'
        ? (JSON.parse(rule.availableDays) as string[])
        : (rule.availableDays as string[]);
      
      const filteredSlots = this.filterSlotsByRule(timeSlots, {
        availableHours,
        availableDays,
        bufferMinutes: rule.bufferMinutes,
      });

      return {
        success: true,
        data: {
          slots: filteredSlots,
          rule: {
            duration: rule.duration,
            bufferMinutes: rule.bufferMinutes,
          },
        },
      };
    }

    // Si no se especifica agente, buscar todas las integraciones del tenant
        const integrations = await this.prisma.calendarintegration.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        id: dto.calendarIntegrationId || undefined,
      },
    });

    if (integrations.length === 0) {
      return {
        success: true,
        data: {
          slots: [],
        },
      };
    }

    // Obtener disponibilidad de todas las integraciones
    const allSlots: Array<{ start: Date; end: Date }> = [];

    for (const integration of integrations) {
      try {
        const decryptedCredentials = JSON.parse(
          EncryptionUtil.decrypt(integration.credentials),
        );
        const provider = this.getProvider(integration.provider);
        const slots = await provider.getAvailability(
          decryptedCredentials,
          startDate,
          endDate,
          dto.timezone,
        );
        allSlots.push(...slots);
      } catch (error) {
        this.logger.warn(`Error getting availability from integration ${integration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      data: {
        slots: allSlots,
      },
    };
  }

  /**
   * Crea un evento en el calendario externo
   */
  async createEvent(
    tenantId: string,
    integrationId: string,
    event: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      attendeeEmail?: string;
      attendeeName?: string;
    },
  ) {
    // Obtener integración
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: integrationId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
        message: 'Calendar integration not found or not active',
      });
    }

    // Desencriptar credenciales
    const decryptedCredentials = JSON.parse(
      EncryptionUtil.decrypt(integration.credentials),
    );

    // Obtener provider y crear evento
    const provider = this.getProvider(integration.provider);
    const calendarEvent = await provider.createEvent(decryptedCredentials, event);

    return {
      success: true,
      data: calendarEvent,
    };
  }

  /**
   * Cancela un evento en el calendario externo
   */
  async cancelEvent(tenantId: string, integrationId: string, eventId: string) {
    // Obtener integración
        const integration = await this.prisma.calendarintegration.findFirst({
      where: {
        id: integrationId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new NotFoundException({
        success: false,
        error_key: 'calendar.integration_not_found',
        message: 'Calendar integration not found or not active',
      });
    }

    // Desencriptar credenciales
    const decryptedCredentials = JSON.parse(
      EncryptionUtil.decrypt(integration.credentials),
    );

    // Obtener provider y cancelar evento
    const provider = this.getProvider(integration.provider);
    const cancelled = await provider.cancelEvent(decryptedCredentials, eventId);

    if (!cancelled) {
      throw new BadRequestException({
        success: false,
        error_key: 'calendar.event_cancellation_failed',
        message: 'Failed to cancel calendar event',
      });
    }

    return {
      success: true,
      data: { cancelled: true },
    };
  }

  /**
   * Obtiene el provider correspondiente según el tipo
   */
  private getProvider(provider: $Enums.calendarintegration_provider) {
    switch (provider) {
      case $Enums.calendarintegration_provider.CAL_COM:
        return this.calComProvider;
      case $Enums.calendarintegration_provider.GOOGLE:
        if (!this.googleCalendarProvider) {
          throw new BadRequestException(
            'Google Calendar provider is not available. The googleapis package is not properly installed.'
          );
        }
        return this.googleCalendarProvider;
      case $Enums.calendarintegration_provider.CUSTOM:
        throw new BadRequestException({
          success: false,
          error_key: 'calendar.custom_provider_not_implemented',
          message: 'Custom calendar provider not yet implemented',
        });
      default:
        throw new BadRequestException({
          success: false,
          error_key: 'calendar.unknown_provider',
          message: 'Unknown calendar provider',
        });
    }
  }

  /**
   * Filtra slots según las reglas del agente
   */
  private filterSlotsByRule(
    slots: Array<{ start: Date; end: Date }>,
    rule: {
      availableHours: { start: string; end: string };
      availableDays: string[];
      bufferMinutes: number;
    },
  ): Array<{ start: Date; end: Date }> {
    return slots.filter((slot) => {
      const slotDate = new Date(slot.start);
      const dayOfWeek = slotDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

      // Filtrar por días disponibles
      if (rule.availableDays && rule.availableDays.length > 0) {
        if (!rule.availableDays.includes(dayOfWeek)) {
          return false;
        }
      }

      // Filtrar por horarios disponibles
      const slotTime = slotDate.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const [startHour, startMinute] = rule.availableHours.start.split(':').map(Number);
      const [endHour, endMinute] = rule.availableHours.end.split(':').map(Number);
      const [slotHour, slotMinute] = slotTime.split(':').map(Number);

      const slotMinutes = slotHour * 60 + slotMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
        return false;
      }

      return true;
    });
  }
}

