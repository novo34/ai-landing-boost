/**
 * Utilidades para detección de intenciones del usuario
 */

export enum Intent {
  GREETING = 'GREETING',
  SCHEDULE_APPOINTMENT = 'SCHEDULE_APPOINTMENT',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  RESCHEDULE_APPOINTMENT = 'RESCHEDULE_APPOINTMENT',
  REQUEST_INFO = 'REQUEST_INFO',
  GOODBYE = 'GOODBYE',
  UNKNOWN = 'UNKNOWN',
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  entities?: Record<string, string>;
}

/**
 * Detecta la intención del usuario basándose en palabras clave
 * 
 * En el futuro esto se puede mejorar con un modelo de clasificación de intents.
 */
export function detectIntent(text: string, language: string = 'es'): IntentResult {
  const textLower = text.toLowerCase().trim();

  // Patrones de saludo
  const greetingPatterns = {
    es: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos', 'hi', 'hello'],
    en: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'hey'],
  };

  // Patrones de agendar cita
  const schedulePatterns = {
    es: [
      'agendar',
      'reservar',
      'cita',
      'hora',
      'disponibilidad',
      'quiero una cita',
      'necesito una cita',
      'puedo agendar',
      'quiero reservar',
    ],
    en: [
      'schedule',
      'book',
      'appointment',
      'available',
      'i want',
      'i need',
      'can i book',
      'make an appointment',
    ],
  };

  // Patrones de cancelar cita
  const cancelPatterns = {
    es: ['cancelar', 'anular', 'eliminar cita', 'no puedo', 'no podré', 'quiero cancelar'],
    en: ['cancel', 'cancel appointment', "can't make it", "won't be able", 'i need to cancel'],
  };

  // Patrones de reagendar
  const reschedulePatterns = {
    es: ['cambiar', 'reagendar', 'mover', 'otra fecha', 'otro día', 'modificar cita'],
    en: ['reschedule', 'change', 'move', 'different time', 'another date', 'modify appointment'],
  };

  // Patrones de despedida
  const goodbyePatterns = {
    es: ['adiós', 'hasta luego', 'hasta pronto', 'gracias', 'chao', 'nos vemos'],
    en: ['goodbye', 'bye', 'see you', 'thanks', 'thank you', 'later'],
  };

  // Patrones de solicitud de información
  const infoPatterns = {
    es: ['información', 'info', 'qué', 'cuál', 'cuándo', 'dónde', 'cómo', 'precio', 'horario'],
    en: ['information', 'info', 'what', 'which', 'when', 'where', 'how', 'price', 'hours'],
  };

  const patterns = language === 'en' ? {
    greeting: greetingPatterns.en,
    schedule: schedulePatterns.en,
    cancel: cancelPatterns.en,
    reschedule: reschedulePatterns.en,
    goodbye: goodbyePatterns.en,
    info: infoPatterns.en,
  } : {
    greeting: greetingPatterns.es,
    schedule: schedulePatterns.es,
    cancel: cancelPatterns.es,
    reschedule: reschedulePatterns.es,
    goodbye: goodbyePatterns.es,
    info: infoPatterns.es,
  };

  // Verificar cada intención
  const checks = [
    {
      intent: Intent.SCHEDULE_APPOINTMENT,
      patterns: patterns.schedule,
      weight: 2,
    },
    {
      intent: Intent.CANCEL_APPOINTMENT,
      patterns: patterns.cancel,
      weight: 2,
    },
    {
      intent: Intent.RESCHEDULE_APPOINTMENT,
      patterns: patterns.reschedule,
      weight: 2,
    },
    {
      intent: Intent.GREETING,
      patterns: patterns.greeting,
      weight: 1,
    },
    {
      intent: Intent.GOODBYE,
      patterns: patterns.goodbye,
      weight: 1,
    },
    {
      intent: Intent.REQUEST_INFO,
      patterns: patterns.info,
      weight: 1.5,
    },
  ];

  let bestMatch: { intent: Intent; confidence: number } = {
    intent: Intent.UNKNOWN,
    confidence: 0,
  };

  for (const check of checks) {
    const matches = check.patterns.filter((pattern) => textLower.includes(pattern)).length;
    if (matches > 0) {
      const confidence = Math.min(0.9, (matches / check.patterns.length) * check.weight * 0.3);
      if (confidence > bestMatch.confidence) {
        bestMatch = { intent: check.intent, confidence };
      }
    }
  }

  // Si no hay match claro, pero el texto es corto, podría ser saludo
  if (bestMatch.intent === Intent.UNKNOWN && textLower.length < 20) {
    const hasGreetingWord = patterns.greeting.some((word) => textLower.includes(word));
    if (hasGreetingWord) {
      bestMatch = { intent: Intent.GREETING, confidence: 0.6 };
    }
  }

  return {
    intent: bestMatch.intent,
    confidence: bestMatch.confidence,
  };
}

/**
 * Extrae entidades básicas del texto (fechas, horas, nombres)
 * 
 * Por ahora es básico. En el futuro se puede mejorar con NER.
 */
export function extractEntities(text: string, language: string = 'es'): Record<string, string> {
  const entities: Record<string, string> = {};

  // Patrones de fecha (básico)
  const datePatterns = {
    es: [
      /\b(\d{1,2})\/(\d{1,2})\b/g, // DD/MM
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi,
    ],
    en: [
      /\b(\d{1,2})\/(\d{1,2})\b/g, // MM/DD
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/gi,
    ],
  };

  // Patrones de hora
  const timePatterns = [
    /\b(\d{1,2}):(\d{2})\b/g, // HH:MM
    /\b(\d{1,2})\s*(am|pm)\b/gi,
  ];

  // Buscar fechas
  const patterns = language === 'en' ? datePatterns.en : datePatterns.es;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      entities.date = matches[0];
      break;
    }
  }

  // Buscar horas
  for (const pattern of timePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      entities.time = matches[0];
      break;
    }
  }

  return entities;
}

