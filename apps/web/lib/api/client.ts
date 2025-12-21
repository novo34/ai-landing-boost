/**
 * Cliente API centralizado
 * Alineado con IA-Specs/05-frontend-standards.mdc
 * 
 * Maneja:
 * - Autenticación automática con cookies HttpOnly
 * - Manejo de errores global
 * - Interceptores para refresh tokens
 * - TypeScript types
 * 
 * NOTA: Los tokens se manejan automáticamente mediante cookies HttpOnly.
 * No se almacenan tokens en localStorage ni en ningún otro lugar accesible desde JavaScript.
 */

/**
 * URL base de la API
 * 
 * Referencias:
 * - Next.js env vars: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
 * - Variables NEXT_PUBLIC_* se exponen al cliente en tiempo de build
 * 
 * Detecta automáticamente la URL correcta del backend usando el sistema de detección de entorno
 */
import { getApiBaseUrl as getApiBaseUrlFromConfig, isNgrok } from '../config/env';
import { measureClientOperation } from '../perf/client-perf';

function getApiBaseUrl(): string {
  // Usar la función de detección de entorno centralizada
  const apiUrl = getApiBaseUrlFromConfig();
  
  // Si no hay URL configurada, usar fallback
  if (!apiUrl) {
    // En el servidor (SSR), usar localhost directamente
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }

    // En el cliente, detectar automáticamente la URL basándose en el hostname actual
    const hostname = window.location.hostname;
    const port = '3001';

    // Si accedes desde localhost o 127.0.0.1, usar localhost:3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:${port}`;
    }

    // Si es una IP local (192.168.x.x, 10.x.x.x, 172.16-31.x.x), usar esa IP
    const localIpPattern = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/;
    if (localIpPattern.test(hostname)) {
      return `http://${hostname}:${port}`;
    }

    // Si accedes desde ngrok o cualquier dominio externo sin proxy configurado,
    // por defecto usar localhost (solo para desarrollo local)
    // NOTA: En producción con ngrok, deberías configurar NEXT_PUBLIC_API_BASE
    return `http://localhost:${port}`;
  }
  
  return apiUrl;
}

const API_BASE_URL = getApiBaseUrl();

// Validar URL en desarrollo (solo si es una URL absoluta)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Si es una ruta relativa (empieza con /), no validar como URL
  if (!API_BASE_URL.startsWith('/')) {
    try {
      new URL(API_BASE_URL);
    } catch {
      console.error('❌ NEXT_PUBLIC_API_URL no es una URL válida:', API_BASE_URL);
    }
  }
}

export interface ApiResponse<T> {
  success: boolean;
  error_key?: string;
  error_params?: Record<string, unknown>;
  data?: T;
}

// Types for API responses
export interface TenantSettings {
  id: string;
  tenantId: string;
  defaultLocale: string;
  timeZone: string;
  country: string;
  dataRegion: string;
  whatsappProvider: string;
  calendarProvider: string;
  businessType?: string;
  industryNotes?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  currency: string;
  priceCents: number;
  interval: 'MONTHLY' | 'YEARLY';
  maxAgents?: number;
  maxChannels?: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'TRIAL' | 'TRIAL_EXPIRED' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'BLOCKED';
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  country: string;
  plan?: BillingPlan;
}

export interface WhatsAppAccount {
  id: string;
  provider: 'EVOLUTION_API' | 'WHATSAPP_CLOUD';
  phoneNumber: string;
  status: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  displayName?: string;
  instanceName?: string;
  qrCodeUrl?: string;
  connectedAt?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  credentials: {
    masked: string;
  };
}

export interface WhatsAppCredentials {
  apiKey?: string;
  instanceName?: string;
  baseUrl?: string;
  accessToken?: string;
  phoneNumberId?: string;
  appId?: string;
  appSecret?: string;
}

export interface CalendarIntegration {
  id: string;
  tenantId: string;
  provider: 'CAL_COM' | 'GOOGLE' | 'CUSTOM';
  status: string;
  createdAt: string;
  updatedAt: string;
  credentials: {
    masked: string;
  };
}

export interface CalendarCredentials {
  // Cal.com credentials
  apiKey?: string;
  eventTypeId?: string;
  // Google Calendar credentials
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  calendarId?: string;
  // Custom provider credentials (generic)
  [key: string]: unknown;
}

export interface KnowledgeCollection {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  sources?: KnowledgeSource[];
}

export interface KnowledgeSource {
  id: string;
  tenantId: string;
  collectionId?: string;
  type: 'FAQ' | 'DOC' | 'URL_SCRAPE' | 'MANUAL_ENTRY' | 'CALENDAR' | 'CRM';
  title: string;
  language: string;
  content?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  collection?: {
    id: string;
    name: string;
  };
  chunks?: Array<{
    id: string;
    chunkIndex: number;
  }>;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  whatsappAccountId: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  languageStrategy: 'AUTO_DETECT' | 'FIXED' | 'MULTI_LANGUAGE';
  defaultLanguage?: string;
  personalitySettings?: Record<string, unknown>;
  knowledgeCollectionIds?: string[];
  calendarIntegrationId?: string;
  n8nWorkflowId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nFlow {
  id: string;
  tenantId: string;
  agentId?: string;
  workflowId: string;
  type: 'LEAD_INTAKE' | 'BOOKING_FLOW' | 'FOLLOWUP' | 'PAYMENT_FAILED' | 'CUSTOM';
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    name: string;
  };
}

export interface Channel {
  id: string;
  tenantId: string;
  type: 'WHATSAPP' | 'VOICE' | 'WEBCHAT' | 'TELEGRAM';
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  channelAgents?: Array<{
    id: string;
    channelId: string;
    agentId: string;
    createdAt: string;
    agent: {
      id: string;
      name: string;
      status: string;
    };
  }>;
}

/**
 * Helper para obtener tenantId de forma segura desde AuthManager
 * CRÍTICO: NO usar sessionStorage directamente porque puede ser compartido entre pestañas
 */
function getTenantId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    // Intentar obtener tenantId de AuthManager (single source of truth)
    const { AuthManager } = require('../auth');
    const authManager = AuthManager.getInstance();
    const state = authManager.getState();
    if (state.tenant?.id) {
      return state.tenant.id;
    }
  } catch (error) {
    // Si AuthManager no está disponible, usar sessionStorage como fallback
    // (solo para compatibilidad durante inicialización)
    return sessionStorage.getItem('currentTenantId');
  }
  
  return null;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private isCheckingAuth = false;
  private checkAuthPromise: Promise<boolean> | null = null;
  private checkAuthCache: { result: boolean; timestamp: number } | null = null;
  private readonly CHECK_AUTH_CACHE_TTL = 300000; // 5 minutos de cache (aumentado significativamente para reducir peticiones)
  
  // Cache para getCurrentUserWithRole
  private isGettingUserWithRole = false;
  private getUserWithRolePromise: Promise<{ user: { id: string; email: string; name?: string }; tenant: { id: string; name: string; status: string; role: string } | null } | null> | null = null;
  private getUserWithRoleCache: { result: { user: { id: string; email: string; name?: string }; tenant: { id: string; name: string; status: string; role: string } | null } | null; timestamp: number } | null = null;
  private readonly GET_USER_WITH_ROLE_CACHE_TTL = 300000; // 5 minutos de cache (aumentado significativamente)
  
  // Flag para evitar loops de 401
  private authFailedRecently = false;
  private authFailedTimestamp = 0;
  private readonly AUTH_FAILED_COOLDOWN = 30000; // 30 segundos de cooldown después de un 401 (aumentado)
  
  // Flag para evitar peticiones cuando hay rate limiting activo
  private rateLimitActive = false;
  private rateLimitUntil = 0;
  private readonly RATE_LIMIT_COOLDOWN = 60000; // 60 segundos de cooldown después de un 429 (aumentado)
  
  // Cache global compartido para /session/me - evita múltiples peticiones simultáneas
  private sessionMeCache: { result: any; timestamp: number } | null = null;
  private sessionMePromise: Promise<any> | null = null;
  private readonly SESSION_ME_CACHE_TTL = 60000; // 60 segundos de cache (reducido para mejor balance)
  
  // Circuit breaker para refresh token failures
  private refreshFailureCount = 0;
  private refreshFailureWindowStart = 0;
  private readonly REFRESH_FAILURE_THRESHOLD = 3; // Máximo 3 fallos consecutivos
  private readonly REFRESH_FAILURE_WINDOW = 30000; // Ventana de 30 segundos
  private circuitBreakerOpen = false;
  private circuitBreakerOpenUntil = 0;
  private readonly CIRCUIT_BREAKER_COOLDOWN = 60000; // 60 segundos antes de intentar de nuevo
  
  // Política anti-loop para refresh
  private refreshAttempts: number[] = []; // Timestamps de intentos de refresh
  private readonly MAX_REFRESH_ATTEMPTS = 3; // Máximo 3 intentos
  private readonly REFRESH_ATTEMPT_WINDOW = 30000; // Ventana de 30 segundos
  private refreshBackoffDelay = 1000; // Delay inicial de 1 segundo (backoff exponencial)
  
  // Observabilidad: contador de llamadas a /session/me
  private sessionMeCallCount = 0;
  private sessionMeCallReasons: Array<{ timestamp: number; reason: string }> = [];

  // Sistema de deduplicación de requests genérico
  // Evita múltiples requests simultáneos al mismo endpoint
  private pendingRequests = new Map<string, Promise<any>>();
  private requestCache = new Map<string, { result: any; timestamp: number }>();
  private readonly REQUEST_CACHE_TTL = 30000; // 30 segundos de cache para requests GET genéricos
  // Cache más largo para endpoints lentos como notificaciones
  private readonly SLOW_ENDPOINT_CACHE_TTL = 60000; // 60 segundos para endpoints lentos
  private readonly DEDUP_WINDOW = 100; // 100ms de ventana para deduplicar requests

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  /**
   * Limpia todos los caches (útil después de logout o cambios de sesión)
   * Público para poder ser llamado desde componentes
   */
  public clearCaches(): void {
    this.checkAuthCache = null;
    this.getUserWithRoleCache = null;
    this.sessionMeCache = null;
    this.sessionMePromise = null;
    this.checkAuthPromise = null;
    this.getUserWithRolePromise = null;
    this.isCheckingAuth = false;
    this.isGettingUserWithRole = false;
    this.rateLimitActive = false;
    this.rateLimitUntil = 0;
    this.pendingRequests.clear();
    this.requestCache.clear();
    
    // Resetear circuit breaker y contadores de refresh
    this.refreshFailureCount = 0;
    this.refreshFailureWindowStart = 0;
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenUntil = 0;
    this.refreshAttempts = [];
    this.refreshBackoffDelay = 1000;
    this.authFailedRecently = false;
    this.authFailedTimestamp = 0;
    
    // Resetear observabilidad
    this.sessionMeCallCount = 0;
    this.sessionMeCallReasons = [];
  }

  /**
   * Invalida específicamente el cache de sesión (útil cuando se actualiza información del usuario)
   * Público para poder ser llamado desde componentes
   */
  public invalidateSessionCache(): void {
    this.sessionMeCache = null;
    this.sessionMePromise = null;
    this.getUserWithRoleCache = null;
    this.getUserWithRolePromise = null;
  }

  /**
   * Intenta refrescar el access token usando AuthManager
   * @deprecated Este método ahora delega a AuthManager.refreshToken()
   */
  private async refreshAccessToken(): Promise<boolean> {
    // Usar AuthManager para refresh (tiene cooldown y mutex integrados)
    if (typeof window !== 'undefined') {
      try {
        const { AuthManager } = await import('../auth/auth-manager');
        const authManager = AuthManager.getInstance();
        return await authManager.refreshToken();
      } catch (error) {
        console.error('[ApiClient] Error al importar AuthManager:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Obtiene la clave de cache para un request
   * CRÍTICO: Incluir tenantId para prevenir cache cross-tenant
   */
  private getRequestCacheKey(endpoint: string, method: string, tenantId?: string | null, body?: string): string {
    // Incluir tenantId en la clave para prevenir cache cross-tenant
    const tenantPart = tenantId ? `:tenant:${tenantId}` : ':tenant:none';
    return `${method}:${endpoint}${tenantPart}:${body || ''}`;
  }

  /**
   * Realiza una petición HTTP con manejo automático de autenticación
   * Incluye deduplicación de requests para evitar múltiples llamadas simultáneas
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Añadir tenant-id desde AuthManager (single source of truth)
    // CRÍTICO: NO usar sessionStorage directamente porque puede ser compartido entre pestañas
    const tenantId = getTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    
    // Logging de seguridad para debugging multi-tenant
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && endpoint.includes('/whatsapp')) {
      console.log('[ApiClient] Request con tenantId:', {
        endpoint,
        tenantId: tenantId || 'NO TENANT ID',
        method: options.method || 'GET',
      });
    }

    const method = options.method || 'GET';
    const url = `${this.baseURL}${endpoint}`;
    // CRÍTICO: Incluir tenantId en la clave de cache para prevenir cache cross-tenant
    const cacheKey = this.getRequestCacheKey(endpoint, method, tenantId, options.body as string);
    
    // Solo loguear requests si está habilitado el debug
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log('📡 Haciendo petición:', {
        method,
        url,
        headers,
        hasBody: !!options.body,
      });
    }
    
    // Si hubo un 401 reciente y no ha pasado el cooldown, evitar hacer la petición
    if (this.authFailedRecently && Date.now() - this.authFailedTimestamp < this.AUTH_FAILED_COOLDOWN) {
      return {
        success: false,
        error_key: 'auth.unauthorized',
      };
    }
    
    // Si hay rate limiting activo, evitar hacer la petición
    if (this.rateLimitActive && Date.now() < this.rateLimitUntil) {
      const remainingTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.warn(`⚠️ Rate limit activo. Esperando ${remainingTime}s antes de reintentar...`);
      }
      // Si hay cache, retornar cache en lugar de error
      // CRÍTICO: El cacheKey incluye tenantId, así que cada tenant tiene su propio cache
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.REQUEST_CACHE_TTL) {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && endpoint.includes('/whatsapp')) {
          console.log('[ApiClient] Cache hit (rate limit):', {
            endpoint,
            tenantId: tenantId || 'NO TENANT ID',
            cacheKey,
          });
        }
        return cached.result;
      }
      return {
        success: false,
        error_key: 'errors.rate_limit_exceeded',
      };
    }

    // Deduplicación: Si ya hay un request pendiente al mismo endpoint, esperar su resultado
    // Solo para GET requests (POST/PUT/DELETE no se deduplican)
    // CRÍTICO: El cacheKey incluye tenantId, así que cada tenant tiene su propia deduplicación
    if (method === 'GET' && this.pendingRequests.has(cacheKey)) {
      const pendingPromise = this.pendingRequests.get(cacheKey);
      if (pendingPromise) {
        // Solo loguear deduplicación si está habilitado el debug detallado
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log(`[PERF][CLIENT] Request deduplicado: ${endpoint} (tenantId: ${tenantId || 'none'})`);
        }
        return pendingPromise;
      }
    }

    // Verificar cache para GET requests
    // CRÍTICO: El cacheKey incluye tenantId, así que cada tenant tiene su propio cache
    if (method === 'GET') {
      const cached = this.requestCache.get(cacheKey);
      if (cached) {
        // Usar cache TTL más largo para endpoints lentos
        const isSlowEndpoint = endpoint.includes('/notifications') || 
                               endpoint.includes('/analytics') ||
                               endpoint.includes('/billing');
        const cacheTTL = isSlowEndpoint ? this.SLOW_ENDPOINT_CACHE_TTL : this.REQUEST_CACHE_TTL;
        if (Date.now() - cached.timestamp < cacheTTL) {
          // Logging de seguridad para debugging multi-tenant
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && endpoint.includes('/whatsapp')) {
            console.log('[ApiClient] Cache hit:', {
              endpoint,
              tenantId: tenantId || 'NO TENANT ID',
              cacheKey,
            });
          }
          return cached.result;
        }
      }
    }

    // Crear promise para deduplicación
    const requestPromise = (async () => {
      try {
        // Instrumentar tiempo de request
        const startTime = performance.now();
        
        // Agregar timeout de 30 segundos (aumentado para conexiones a través de ngrok)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include', // Incluir cookies HttpOnly automáticamente
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Log de tiempo de request (solo en dev y solo si es lento o está habilitado el debug)
        if (process.env.NODE_ENV === 'development') {
          const duration = performance.now() - startTime;
          // Solo loguear requests lentos (>200ms) o si está habilitado el debug detallado
          if (duration > 200 || process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log(`[PERF][CLIENT] API.request.${method}.${endpoint} ... ${duration.toFixed(2)}ms`);
          }
        }
        
        // Solo loguear respuestas si está habilitado el debug (y no es un 401 en checkAuth o 403 esperado)
        // Los 403 son esperados para endpoints que requieren roles específicos (OWNER/ADMIN)
        const isExpected403 = response.status === 403 && (
          endpoint === '/billing/current' ||
          endpoint.startsWith('/agents') ||
          endpoint.startsWith('/channels') ||
          endpoint.startsWith('/appointments') ||
          endpoint.startsWith('/whatsapp/accounts')
        );
        
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && 
            !(response.status === 401 && endpoint === '/users/me') &&
            !isExpected403) {
          console.log('📡 Respuesta recibida:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
          });
        }

        // Manejar errores HTTP específicos
        // Referencias:
        // - HTTP status codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
        // - 400 Bad Request: error de validación o datos incorrectos
        // - 401 Unauthorized: token inválido o expirado
        // - 403 Forbidden: usuario autenticado pero sin permisos
        // - 429 Too Many Requests: rate limiting
        
        // Manejar 400 (Bad Request) - error de validación o datos incorrectos
        if (response.status === 400) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json().catch(() => ({
              success: false,
              error_key: 'errors.bad_request',
            }));
            // Loguear el error para debugging
            if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
              console.error('❌ Error 400 (Bad Request):', {
                endpoint,
                errorData,
                message: errorData.message || errorData.error_key || 'Bad Request',
              });
            }
            // Asegurar que el error_key del backend se preserve
            // El backend puede devolver error_key, message, o ambos
            // Solo incluimos campos que están en la interfaz ApiResponse
            return {
              success: false,
              error_key: errorData.error_key || 'errors.bad_request',
              error_params: errorData.error_params,
            };
          }
          return {
            success: false,
            error_key: 'errors.bad_request',
          };
        }
        
        // Manejar 403 (Forbidden) - puede ser por permisos insuficientes
        // Esto es esperado para endpoints que requieren roles específicos (ej: /billing/current requiere OWNER/ADMIN)
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({
            success: false,
            error_key: 'auth.insufficient_permissions',
          }));
          // No loguear 403 en consola si es por permisos (es esperado y manejado gracefully)
          // El navegador puede mostrar el error en la red, pero no lo logueamos aquí para evitar spam
          return errorData;
        }
        
        // Manejo mejorado de 401 vs 403
        // 401 = Unauthorized (token inválido/expirado) => intentar refresh UNA vez
        // 403 = Forbidden (sin permisos) => NO intentar refresh, retornar error directamente
        if (response.status === 401) {
          // Marcar que hubo un fallo de autenticación
          this.authFailedRecently = true;
          this.authFailedTimestamp = Date.now();
          
          // Limpiar caches de autenticación
          this.checkAuthCache = null;
          this.getUserWithRoleCache = null;
          this.sessionMeCache = null;
          
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('🔄 Token expirado (401), intentando refresh...');
          }
          
          // Verificar circuit breaker antes de intentar refresh
          if (this.circuitBreakerOpen && Date.now() < this.circuitBreakerOpenUntil) {
            // Circuit breaker abierto, no intentar refresh
            // Limpiar caches y retornar error
            const errorData = await response.json().catch(() => ({
              success: false,
              error_key: 'auth.session_expired',
            }));
            
            // Log estructurado
            if (process.env.NODE_ENV === 'development') {
              console.log('[PERF][CLIENT] auth.401.circuit_breaker_open', {
                endpoint,
                circuitBreakerOpenUntil: this.circuitBreakerOpenUntil,
              });
            }
            
            return errorData;
          }
          
          // Intentar refresh usando AuthManager (tiene cooldown y mutex integrados)
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Si el refresh fue exitoso, limpiar el flag
            this.authFailedRecently = false;
            this.authFailedTimestamp = 0;
            
            if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
              console.log('✅ Refresh exitoso, reintentando petición...');
            }
            
            // Reintentar la petición original (solo una vez)
            const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
              ...options,
              headers,
              credentials: 'include',
            });
            
            if (!retryResponse.ok && retryResponse.status === 401) {
              // Refresh falló, mantener el flag activo y limpiar caches
              this.checkAuthCache = null;
              this.getUserWithRoleCache = null;
              this.sessionMeCache = null;
              const errorData = await retryResponse.json().catch(() => ({
                success: false,
                error_key: 'auth.unauthorized',
              }));
              
              // Log estructurado
              if (process.env.NODE_ENV === 'development') {
                console.log('[PERF][CLIENT] auth.401.refresh_failed', { endpoint });
              }
              
              return errorData;
            }
            
            // Si el retry fue exitoso, procesar la respuesta normalmente
            const contentType = retryResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              return {
                success: false,
                error_key: 'errors.invalid_response',
                data: undefined,
              };
            }
            
            const retryData: ApiResponse<T> = await retryResponse.json();
            
            // Log estructurado
            if (process.env.NODE_ENV === 'development') {
              console.log('[PERF][CLIENT] auth.401.refresh_success', { endpoint });
            }
            
            return retryData;
          } else {
            // Refresh falló (circuit breaker o error), mantener el flag activo y limpiar caches
            this.checkAuthCache = null;
            this.getUserWithRoleCache = null;
            this.sessionMeCache = null;
            const errorData = await response.json().catch(() => ({
              success: false,
              error_key: this.circuitBreakerOpen ? 'auth.session_expired' : 'auth.unauthorized',
            }));
            
            // Log estructurado
            if (process.env.NODE_ENV === 'development') {
              console.log('[PERF][CLIENT] auth.401.refresh_failed', {
                endpoint,
                circuitBreakerOpen: this.circuitBreakerOpen,
              });
            }
            
            return errorData;
          }
        } else if (response.ok) {
          // Si la petición fue exitosa, limpiar el flag de fallo de autenticación
          this.authFailedRecently = false;
          this.authFailedTimestamp = 0;
        }

        // Si es 429 (Rate Limiting), activar cooldown y retornar error sin reintentar
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : this.RATE_LIMIT_COOLDOWN;
          
          // Solo activar cooldown si no estaba ya activo (evitar resetear el timer)
          const wasAlreadyActive = this.rateLimitActive;
          if (!wasAlreadyActive) {
            this.rateLimitActive = true;
            this.rateLimitUntil = Date.now() + waitTime;
            
            // Solo loguear rate limit la primera vez para evitar spam en consola
            if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
              console.warn(`⚠️ Rate limit alcanzado. Cooldown activo por ${Math.ceil(waitTime / 1000)}s`);
              console.warn('💡 Usando cache si está disponible. Evitando más requests hasta que expire el cooldown');
            }
          }
          
          // Si hay cache de session/me, intentar usarlo en lugar de retornar error
          if (this.sessionMeCache && Date.now() - this.sessionMeCache.timestamp < this.SESSION_ME_CACHE_TTL) {
            if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
              console.log('💾 Usando cache de sesión debido a rate limit');
            }
            return this.sessionMeCache.result;
          }
          
          // Retornar error sin reintentar para evitar más peticiones
          const errorData = await response.json().catch(() => ({
            success: false,
            error_key: 'errors.rate_limit_exceeded',
          }));
          return errorData;
        } else if (response.ok) {
          // Si la petición fue exitosa, limpiar el flag de rate limit
          this.rateLimitActive = false;
          this.rateLimitUntil = 0;
        }

        // Si no es JSON, retornar error
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return {
            success: false,
            error_key: 'errors.invalid_response',
            data: undefined,
          };
        }

        const data: ApiResponse<T> = await response.json();
        
        // Guardar en cache para GET requests exitosos
        // CRÍTICO: El cacheKey ya incluye tenantId, así que cada tenant tiene su propio cache
        if (method === 'GET' && data.success) {
          this.requestCache.set(cacheKey, {
            result: data,
            timestamp: Date.now(),
          });
          
          // Logging de seguridad para debugging multi-tenant
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && endpoint.includes('/whatsapp')) {
            console.log('[ApiClient] Cache guardado:', {
              endpoint,
              tenantId: tenantId || 'NO TENANT ID',
              cacheKey,
            });
          }
          // Limpiar cache antiguo periódicamente (mantener solo los últimos 100 entries)
          if (this.requestCache.size > 100) {
            const entries = Array.from(this.requestCache.entries());
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            this.requestCache.clear();
            entries.slice(0, 100).forEach(([key, value]) => {
              this.requestCache.set(key, value);
            });
          }
        }
        
        // Limpiar promise pendiente después de completar exitosamente
        if (method === 'GET') {
          this.pendingRequests.delete(cacheKey);
        }
        
        return data;
      } catch (error) {
        // Limpiar promise en caso de error
        if (method === 'GET') {
          this.pendingRequests.delete(cacheKey);
        }
        throw error;
      } finally {
        // Asegurar que siempre se limpie el promise pendiente
        if (method === 'GET') {
          // Usar setTimeout para limpiar después de que todos los awaiters hayan recibido el resultado
          setTimeout(() => {
            this.pendingRequests.delete(cacheKey);
          }, 0);
        }
      }
    })();
    
    // Guardar promise para deduplicación (solo GET)
    if (method === 'GET') {
      this.pendingRequests.set(cacheKey, requestPromise);
    }
    
    try {
      const result = await requestPromise;
      return result;
    } catch (error) {
      // Limpiar promise en caso de error
      if (method === 'GET') {
        this.pendingRequests.delete(cacheKey);
      }
      
      console.error('❌ API request error:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('⏱️ Timeout: El servidor no respondió en 30 segundos');
          return {
            success: false,
            error_key: 'errors.timeout',
            data: undefined,
          };
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('🔌 Error de conexión: El servidor no está disponible');
          console.error('💡 Verifica que el backend esté corriendo en', this.baseURL);
          return {
            success: false,
            error_key: 'errors.connection_refused',
            data: undefined,
          };
        }
      }
      return {
        success: false,
        error_key: 'errors.network_error',
        data: undefined,
      };
    } finally {
      // Limpiar promise después de completar (solo GET)
      if (method === 'GET') {
        // Esperar un poco antes de limpiar para permitir que otros requests pendientes se unan
        setTimeout(() => {
          this.pendingRequests.delete(cacheKey);
        }, this.DEDUP_WINDOW);
      }
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Métodos específicos para auth
  /**
   * Inicia sesión. Los tokens se guardan automáticamente en cookies HttpOnly.
   * El body solo contiene información del usuario, no los tokens.
   */
  async login(email: string, password: string): Promise<ApiResponse<{ id: string; email: string; name?: string }>> {
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log('🌐 Cliente API - Iniciando login...');
    }
    
    try {
      const response = await this.post<{ id: string; email: string; name?: string }>('/auth/login', {
        email,
        password,
      });
      
        // Si el login fue exitoso, limpiar caches para forzar una nueva verificación
        // Esto asegura que después del login se obtenga información fresca
        if (response.success) {
          this.checkAuthCache = null;
          this.getUserWithRoleCache = null;
          this.sessionMeCache = null; // Limpiar cache compartido también
          this.authFailedRecently = false;
          this.authFailedTimestamp = 0;
          this.rateLimitActive = false;
          this.rateLimitUntil = 0;
        }
      
      return response;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario. Los tokens se guardan automáticamente en cookies HttpOnly.
   * El body solo contiene información del usuario, no los tokens.
   */
  async register(
    email: string,
    password: string,
    name?: string,
    tenantName?: string,
  ): Promise<ApiResponse<{ id: string; email: string; name?: string }>> {
    const response = await this.post<{ id: string; email: string; name?: string }>('/auth/register', {
      email,
      password,
      name,
      tenantName,
    });
    return response;
  }

  /**
   * Cierra sesión y limpia las cookies
   */
  async logout(): Promise<void> {
    try {
      // Intentar llamar al endpoint de logout
      await this.post('/auth/logout').catch((error) => {
        // Si falla, no importa, continuamos con la limpieza local
        console.warn('⚠️ Error al llamar al endpoint de logout (continuando con limpieza local):', error);
      });
    } catch (error) {
      // Si hay error, continuar con la limpieza local
      console.warn('⚠️ Error en logout (continuando con limpieza local):', error);
    }
    
    // Limpiar estado local siempre PRIMERO
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    
    // Limpiar todos los caches INMEDIATAMENTE usando el método centralizado
    this.clearCaches();
    this.authFailedRecently = true; // Marcar como no autenticado
    this.authFailedTimestamp = Date.now();
    
    // Forzar limpieza de cookies del navegador (si es posible)
    // Nota: Las cookies HttpOnly solo se pueden limpiar desde el servidor
    // pero ya las limpiamos con el endpoint de logout
  }

  /**
   * Verifica si el usuario está autenticado llamando al endpoint /users/me
   * Esto es más confiable que verificar tokens en localStorage
   * Implementa cache y debounce para evitar múltiples llamadas simultáneas
   */
  async checkAuth(): Promise<boolean> {
    // Si se hizo logout recientemente, retornar false inmediatamente
    if (this.authFailedRecently && Date.now() - this.authFailedTimestamp < this.AUTH_FAILED_COOLDOWN) {
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('🚪 Logout reciente detectado, retornando false sin verificar');
      }
      return false;
    }
    
    // Verificar cache primero
    if (this.checkAuthCache) {
      const now = Date.now();
      if (now - this.checkAuthCache.timestamp < this.CHECK_AUTH_CACHE_TTL) {
        return this.checkAuthCache.result;
      }
    }
    
    // Si hay rate limiting activo, retornar cache si existe o false
    if (this.rateLimitActive && Date.now() < this.rateLimitUntil) {
      if (this.checkAuthCache) {
        return this.checkAuthCache.result;
      }
      // Si hay cache de session/me, usarlo
      if (this.sessionMeCache) {
        const result = this.sessionMeCache.result.success && !!(this.sessionMeCache.result as any).data?.user;
        this.checkAuthCache = { result, timestamp: Date.now() };
        return result;
      }
      return false;
    }

    // Si ya hay una verificación en curso, esperar su resultado
    if (this.isCheckingAuth && this.checkAuthPromise) {
      return this.checkAuthPromise;
    }

    // Iniciar nueva verificación usando el cache compartido
    this.isCheckingAuth = true;
    this.checkAuthPromise = (async () => {
      try {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('🔍 Verificando autenticación (session/me)...');
        }
        
        // Usar getSessionMe que tiene cache compartido
        const response = await this.getSessionMe('checkAuth');
        const result = response.success && !!(response as any).data?.user;
        
        if (result && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('✅ Usuario autenticado');
          // Actualizar cache solo si es exitoso
          this.checkAuthCache = {
            result,
            timestamp: Date.now(),
          };
        } else {
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.warn('❌ Usuario no autenticado:', response.error_key || 'Unknown error');
          }
          // Limpiar cache si falla
          this.checkAuthCache = null;
          this.sessionMeCache = null;
        }
        
        return result;
      } catch (error) {
        // Solo loguear errores que no sean de autenticación
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.error('❌ Error verificando autenticación:', error);
        }
        // Limpiar cache en caso de error (excepto si es rate limit)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('rate limit') && !errorMessage.includes('429')) {
          this.checkAuthCache = null;
          this.sessionMeCache = null;
        }
        return false;
      } finally {
        this.isCheckingAuth = false;
        this.checkAuthPromise = null;
      }
    })();

    return this.checkAuthPromise;
  }


  /**
   * Obtiene la sesión del usuario desde el backend
   * Usa cache compartido y single-flight para evitar múltiples peticiones simultáneas
   * Implementa observabilidad con logs estructurados
   */
  private async getSessionMe(reason: string = 'unknown'): Promise<any> {
    // Observabilidad: registrar motivo de llamada
    this.sessionMeCallCount++;
    this.sessionMeCallReasons.push({
      timestamp: Date.now(),
      reason,
    });
    
    // Mantener solo últimos 50 motivos
    if (this.sessionMeCallReasons.length > 50) {
      this.sessionMeCallReasons.shift();
    }
    
    // Verificar cache primero
    if (this.sessionMeCache) {
      const now = Date.now();
      if (now - this.sessionMeCache.timestamp < this.SESSION_ME_CACHE_TTL) {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('[PERF][CLIENT] session.me.cache_hit', { reason, age: now - this.sessionMeCache.timestamp });
        }
        return this.sessionMeCache.result;
      }
    }
    
    // Si hay rate limiting activo, retornar cache si existe
    if (this.rateLimitActive && Date.now() < this.rateLimitUntil) {
      if (this.sessionMeCache) {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('[PERF][CLIENT] session.me.rate_limited_cache', { reason });
        }
        return this.sessionMeCache.result;
      }
      // Si no hay cache y hay rate limiting, lanzar error
      throw new Error('Rate limit activo. Por favor espera antes de reintentar.');
    }
    
    // Single-flight mejorado: si ya hay una petición en curso, esperar su resultado
    if (this.sessionMePromise) {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('[PERF][CLIENT] session.me.deduplicated', { reason });
      }
      return this.sessionMePromise;
    }
    
    // Iniciar nueva petición
    const startTime = performance.now();
    this.sessionMePromise = (async () => {
      try {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('[PERF][CLIENT] session.me.request', { reason, callCount: this.sessionMeCallCount });
        }
        
        const response = await this.get('/session/me');
        
        const duration = performance.now() - startTime;
        
        // Guardar en cache solo si es exitoso
        if (response.success && (response as any).data) {
          this.sessionMeCache = {
            result: response,
            timestamp: Date.now(),
          };
          
          // Log estructurado para observabilidad
          if (process.env.NODE_ENV === 'development') {
            console.log('[PERF][CLIENT] session.me.success', {
              reason,
              duration: duration.toFixed(2),
              callCount: this.sessionMeCallCount,
            });
          }
        } else {
          // Si falla, limpiar cache
          this.sessionMeCache = null;
          
          // Log estructurado para observabilidad
          if (process.env.NODE_ENV === 'development') {
            console.log('[PERF][CLIENT] session.me.failure', {
              reason,
              duration: duration.toFixed(2),
              error_key: (response as any).error_key,
            });
          }
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        // En caso de error, limpiar cache y promise
        this.sessionMeCache = null;
        
        // Log estructurado para observabilidad
        if (process.env.NODE_ENV === 'development') {
          console.log('[PERF][CLIENT] session.me.error', {
            reason,
            duration: duration.toFixed(2),
            error: error instanceof Error ? error.message : String(error),
          });
        }
        
        throw error;
      } finally {
        this.sessionMePromise = null;
      }
    })();
    
    return this.sessionMePromise;
  }

  /**
   * Obtiene el usuario autenticado
   */
  async getCurrentUser(): Promise<ApiResponse<{
    id: string;
    email: string;
    name?: string;
    locale?: string;
    timeZone?: string;
    emailVerified?: boolean;
    platformRole?: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;
  }>> {
      try {
        const response = await this.getSessionMe('getCurrentUser');
      if (!response.success || !(response as any).data?.user) {
        return {
          success: false,
          error_key: response.error_key,
        };
      }

      const sessionData = (response as any).data;

      return {
        success: true,
        data: {
          id: sessionData.user.id,
          email: sessionData.user.email,
          name: sessionData.user.name,
          locale: sessionData.user.locale,
          timeZone: sessionData.user.timeZone,
          emailVerified: sessionData.user.emailVerified, // Incluir emailVerified
          platformRole: sessionData.platformRole,
        },
      };
    } catch (error) {
      return {
        success: false,
        error_key: 'errors.session_fetch_failed',
      };
    }
  }

  /**
   * Obtiene el usuario autenticado con su tenant actual y rol
   * Útil para determinar a qué dashboard redirigir tras login
   * Implementa cache y debounce para evitar múltiples llamadas simultáneas
   * 
   * @deprecated Usar AuthManager.getState() en su lugar
   * Este método se mantiene por compatibilidad durante la migración
   */
  async getCurrentUserWithRole(): Promise<{
    user: { id: string; email: string; name?: string };
    platformRole?: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;
    tenant: { id: string; name: string; status: string; role: string } | null;
  } | null> {
    // Verificar cache primero
    if (this.getUserWithRoleCache) {
      const now = Date.now();
      if (now - this.getUserWithRoleCache.timestamp < this.GET_USER_WITH_ROLE_CACHE_TTL) {
        return this.getUserWithRoleCache.result;
      }
    }

    // Si ya hay una petición en curso, esperar su resultado
    if (this.isGettingUserWithRole && this.getUserWithRolePromise) {
      return this.getUserWithRolePromise;
    }
    
    // Si hay rate limiting activo, retornar cache si existe o null
    if (this.rateLimitActive && Date.now() < this.rateLimitUntil) {
      if (this.getUserWithRoleCache) {
        return this.getUserWithRoleCache.result;
      }
      return null;
    }

    // Iniciar nueva petición
    this.isGettingUserWithRole = true;
    this.getUserWithRolePromise = (async () => {
      try {
        // Usar getSessionMe que tiene cache compartido y evita múltiples peticiones
        const sessionResponse = await this.getSessionMe('getCurrentUserWithRole');

        if (!sessionResponse.success || !(sessionResponse as any).data?.user) {
          return null;
        }

        const sessionData = (sessionResponse as any).data as {
          user: { id: string; email: string; name?: string };
          platformRole?: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;
          currentTenant: { tenantId: string; name: string; slug: string; status: string; role: string } | null;
          tenants?: Array<{ tenantId: string; name: string; slug: string; status: string; role: string }>;
        };

        // Usar currentTenant si existe, sino usar el primer tenant disponible como fallback
        let tenant = null;
        if (sessionData.currentTenant) {
          tenant = {
            id: sessionData.currentTenant.tenantId,
            name: sessionData.currentTenant.name,
            status: sessionData.currentTenant.status,
            role: sessionData.currentTenant.role,
          };
        } else if (sessionData.tenants && sessionData.tenants.length > 0) {
          // Fallback: usar el primer tenant disponible
          const firstTenant = sessionData.tenants[0];
          tenant = {
            id: firstTenant.tenantId,
            name: firstTenant.name,
            status: firstTenant.status,
            role: firstTenant.role,
          };
          console.log('⚠️ No hay currentTenant, usando primer tenant como fallback:', tenant);
        }

        // Guardar tenantId en sessionStorage para que se envíe en futuras peticiones
        // Esto asegura que el header x-tenant-id esté presente en todas las peticiones
        if (typeof window !== 'undefined') {
          if (tenant) {
            sessionStorage.setItem('currentTenantId', tenant.id);
          } else {
            sessionStorage.removeItem('currentTenantId');
          }
        }

        const result: { user: { id: string; email: string; name?: string }; platformRole?: 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null; tenant: { id: string; name: string; status: string; role: string } | null } = {
          user: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            name: sessionData.user.name,
          },
          platformRole: sessionData.platformRole ?? null,
          tenant,
        };

        // Actualizar cache solo si es exitoso
        this.getUserWithRoleCache = {
          result,
          timestamp: Date.now(),
        };

        return result;
      } catch (error) {
        console.error('Error obteniendo usuario con rol:', error);
        // Limpiar cache en caso de error
        this.getUserWithRoleCache = null;
        return null;
      } finally {
        this.isGettingUserWithRole = false;
        this.getUserWithRolePromise = null;
      }
    })();

    return this.getUserWithRolePromise;
  }

  // ============================================
  // Métodos para User Management
  // ============================================

  /**
   * Obtiene las identidades SSO del usuario actual
   */
  async getUserIdentities(): Promise<ApiResponse<Array<{
    id: string;
    provider: string;
    providerId: string;
    email: string;
    createdAt: string;
  }>>> {
    return this.get('/users/me/identities');
  }

  /**
   * Elimina una identidad SSO del usuario actual
   */
  async deleteUserIdentity(identityId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.delete(`/users/me/identities/${identityId}`);
  }

  // ============================================
  // Métodos para Tenant Settings
  // ============================================

  /**
   * Obtiene las configuraciones del tenant actual
   */
  async getTenantSettings(): Promise<ApiResponse<TenantSettings>> {
    return this.get<TenantSettings>('/tenants/settings');
  }

  /**
   * Actualiza las configuraciones del tenant actual
   */
  async updateTenantSettings(data: Partial<TenantSettings>): Promise<ApiResponse<TenantSettings>> {
    return this.put<TenantSettings>('/tenants/settings', data);
  }

  /**
   * Sube un logo
   */
  async uploadLogo(file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    const formData = new FormData();
    formData.append('logo', file);
    
    // Para FormData, no establecer Content-Type (el navegador lo hace automáticamente con boundary)
    const headers: Record<string, string> = {};
    const tenantId = getTenantId();
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }

    const url = `${this.baseURL}/tenants/settings/logo`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error_key: 'errors.upload_failed' }));
      return {
        success: false,
        error_key: error.error_key || 'errors.upload_failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data,
    };
  }

  /**
   * Elimina el logo
   */
  async deleteLogo(): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>('/tenants/settings/logo');
  }

  /**
   * Actualiza colores
   */
  async updateColors(data: {
    primaryColor?: string;
    secondaryColor?: string;
  }): Promise<ApiResponse<TenantSettings>> {
    return this.put<TenantSettings>('/tenants/settings/colors', data);
  }

  // ============================================
  // Métodos para Team Management
  // ============================================

  /**
   * Obtiene los miembros del equipo y invitaciones pendientes
   */
  async getTeamMembers(): Promise<ApiResponse<{
    members: Array<{
      id: string;
      email: string;
      name?: string;
      role: string;
      joinedAt: string;
      status: string;
    }>;
    pendingInvitations: Array<{
      id: string;
      email: string;
      role: string;
      invitedBy: string;
      invitedAt: string;
      expiresAt: string;
    }>;
  }>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.get(`/team/members`);
  }

  /**
   * Cambia el rol de un miembro
   */
  async changeMemberRole(userId: string, role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER'): Promise<ApiResponse<{ success: boolean; message: string }>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.post(`/team/members/${userId}/role`, { role });
  }

  /**
   * Remueve un miembro del equipo
   */
  async removeMember(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new Error('No tenant ID found');
    }
    return this.delete(`/tenants/${tenantId}/team/members/${userId}`);
  }

  /**
   * Transfiere la propiedad del tenant
   */
  async transferOwnership(newOwnerId: string, confirmationCode?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.post(`/team/transfer-ownership`, { newOwnerId, confirmationCode });
  }

  /**
   * Crea una invitación
   */
  async createInvitation(email: string, role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER'): Promise<ApiResponse<{
    id: string;
    email: string;
    role: string;
    expiresAt: string;
  }>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.post(`/invitations`, { email, role });
  }

  /**
   * Lista las invitaciones del tenant
   */
  async listInvitations(): Promise<ApiResponse<Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    invitedBy: string;
    createdAt: string;
    expiresAt: string;
  }>>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.get(`/invitations`);
  }

  /**
   * Cancela una invitación
   */
  async cancelInvitation(invitationId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    // CRÍTICO: No usar tenantId en la URL - viene del header x-tenant-id (validado por TenantContextGuard)
    return this.delete(`/invitations/${invitationId}`);
  }

  // ============================================
  // Métodos para Billing
  // ============================================

  /**
   * Obtiene todos los planes de suscripción disponibles
   */
  async getBillingPlans(): Promise<ApiResponse<BillingPlan[]>> {
    return this.get<BillingPlan[]>('/billing/plans');
  }

  /**
   * Obtiene la información de suscripción del tenant actual
   * 
   * Nota: Este endpoint requiere rol OWNER o ADMIN.
   * Si el usuario no tiene estos roles, retornará 403.
   * El frontend debe manejar este caso gracefully.
   */
  async getCurrentSubscription(): Promise<ApiResponse<Subscription>> {
    const response = await this.get<Subscription>('/billing/current');
    
    // Si es 403, el usuario no tiene permisos (no es OWNER/ADMIN)
    // Esto es esperado para usuarios con rol AGENT o VIEWER
    // Retornamos un error_key específico para que el frontend lo maneje
    if (!response.success && response.error_key) {
      // Si el error es de permisos, lo dejamos pasar para que el componente lo maneje
      // No es un error crítico, solo significa que el usuario no puede ver billing
      return response;
    }
    
    return response;
  }

  /**
   * Obtiene el uso actual del tenant (agentes, canales, mensajes)
   */
  async getBillingUsage(): Promise<ApiResponse<{
    agents: {
      current: number;
      limit: number | null;
      percentage: number;
    };
    channels: {
      current: number;
      limit: number | null;
      percentage: number;
    };
    messages: {
      current: number;
      limit: number | null;
    };
  }>> {
    return this.get('/billing/usage');
  }

  /**
   * Crea una checkout session de Stripe para suscribirse a un plan
   */
  async createCheckout(planId: string): Promise<ApiResponse<{ checkoutUrl: string }>> {
    return this.post<{ checkoutUrl: string }>('/billing/checkout', { planId });
  }

  /**
   * Crea una portal session de Stripe para gestionar la suscripción
   */
  async createPortal(): Promise<ApiResponse<{ portalUrl: string }>> {
    return this.post<{ portalUrl: string }>('/billing/portal', {});
  }

  /**
   * Cancela la suscripción (marca para cancelar al final del período)
   */
  async cancelSubscription(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post<{ success: boolean; message: string }>('/billing/cancel', {});
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post<{ success: boolean; message: string }>('/billing/reactivate', {});
  }

  // ============================================
  // Métodos para WhatsApp
  // ============================================

  /**
   * Obtiene todas las cuentas de WhatsApp del tenant
   */
  async getWhatsAppAccounts(): Promise<ApiResponse<WhatsAppAccount[]>> {
    return this.get<WhatsAppAccount[]>('/whatsapp/accounts');
  }

  /**
   * Obtiene una cuenta de WhatsApp específica por ID
   */
  async getWhatsAppAccount(id: string): Promise<ApiResponse<WhatsAppAccount>> {
    return this.get<WhatsAppAccount>(`/whatsapp/accounts/${id}`);
  }

  /**
   * Crea una nueva cuenta de WhatsApp
   */
  async createWhatsAppAccount(data: {
    provider: 'EVOLUTION_API' | 'WHATSAPP_CLOUD';
    credentials: WhatsAppCredentials;
  }): Promise<ApiResponse<WhatsAppAccount>> {
    return this.post<WhatsAppAccount>('/whatsapp/accounts', data);
  }

  /**
   * Actualiza una cuenta de WhatsApp
   */
  async updateWhatsAppAccount(id: string, data: {
    credentials?: WhatsAppCredentials;
    displayName?: string;
    instanceName?: string;
  }): Promise<ApiResponse<WhatsAppAccount>> {
    return this.put<WhatsAppAccount>(`/whatsapp/accounts/${id}`, data);
  }

  /**
   * Elimina una cuenta de WhatsApp
   */
  async deleteWhatsAppAccount(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/whatsapp/accounts/${id}`);
  }

  /**
   * Valida la conexión de una cuenta de WhatsApp
   */
  async validateWhatsAppAccount(id: string): Promise<ApiResponse<{ status: string; phoneNumber: string; displayName: string; validatedAt: string }>> {
    return this.post<{ status: string; phoneNumber: string; displayName: string; validatedAt: string }>(`/whatsapp/accounts/${id}/validate`);
  }

  /**
   * Reconecta una cuenta de WhatsApp (obtiene nuevo QR si es necesario)
   */
  async reconnectWhatsAppAccount(id: string): Promise<ApiResponse<{ id: string; status: string; qrCodeUrl?: string | null }>> {
    return this.post<{ id: string; status: string; qrCodeUrl?: string | null }>(`/whatsapp/accounts/${id}/reconnect`);
  }

  /**
   * Obtiene el QR code de una cuenta de WhatsApp (Evolution API)
   */
  async getWhatsAppQRCode(id: string): Promise<ApiResponse<{ qrCodeUrl: string | null }>> {
    return this.get(`/whatsapp/accounts/${id}/qr`);
  }

  // ============================================
  // Métodos para Calendar Integrations
  // ============================================

  /**
   * Obtiene todas las integraciones de calendario del tenant
   */
  async getCalendarIntegrations(): Promise<ApiResponse<CalendarIntegration[]>> {
    return this.get<CalendarIntegration[]>('/calendars/integrations');
  }

  /**
   * Obtiene una integración de calendario específica por ID
   */
  async getCalendarIntegration(id: string): Promise<ApiResponse<CalendarIntegration>> {
    return this.get<CalendarIntegration>(`/calendars/integrations/${id}`);
  }

  /**
   * Crea una nueva integración de calendario
   */
  async createCalendarIntegration(data: {
    provider: 'CAL_COM' | 'GOOGLE' | 'CUSTOM';
    credentials: CalendarCredentials;
    status?: string;
  }): Promise<ApiResponse<CalendarIntegration>> {
    return this.post<CalendarIntegration>('/calendars/integrations', data);
  }

  /**
   * Actualiza una integración de calendario
   */
  async updateCalendarIntegration(id: string, data: {
    credentials?: CalendarCredentials;
    status?: string;
  }): Promise<ApiResponse<CalendarIntegration>> {
    return this.put<CalendarIntegration>(`/calendars/integrations/${id}`, data);
  }

  /**
   * Elimina una integración de calendario
   */
  async deleteCalendarIntegration(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/calendars/integrations/${id}`);
  }

  // ============================================
  // Métodos para Agentes
  // ============================================

  /**
   * Obtiene todos los agentes del tenant
   */
  async getAgents(): Promise<ApiResponse<Agent[]>> {
    return this.get<Agent[]>('/agents');
  }

  /**
   * Obtiene un agente específico por ID
   */
  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    return this.get<Agent>(`/agents/${id}`);
  }

  /**
   * Crea un nuevo agente
   */
  async createAgent(data: {
    name: string;
    whatsappAccountId: string;
    status?: 'ACTIVE' | 'PAUSED' | 'DISABLED';
    languageStrategy?: 'AUTO_DETECT' | 'FIXED' | 'MULTI_LANGUAGE';
    defaultLanguage?: string;
    personalitySettings?: Record<string, unknown>;
    knowledgeCollectionIds?: string[];
    calendarIntegrationId?: string;
    n8nWorkflowId?: string;
  }): Promise<ApiResponse<Agent>> {
    return this.post<Agent>('/agents', data);
  }

  /**
   * Actualiza un agente
   */
  async updateAgent(
    id: string,
    data: {
      name?: string;
      whatsappAccountId?: string;
      status?: 'ACTIVE' | 'PAUSED' | 'DISABLED';
      languageStrategy?: 'AUTO_DETECT' | 'FIXED' | 'MULTI_LANGUAGE';
      defaultLanguage?: string;
      personalitySettings?: Record<string, unknown>;
      knowledgeCollectionIds?: string[];
      calendarIntegrationId?: string;
      n8nWorkflowId?: string;
    },
  ): Promise<ApiResponse<Agent>> {
    return this.put<Agent>(`/agents/${id}`, data);
  }

  /**
   * Elimina un agente
   */
  async deleteAgent(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/agents/${id}`);
  }

  // ============================================
  // Métodos para Knowledge Base
  // ============================================

  /**
   * Obtiene todas las colecciones de conocimiento del tenant
   */
  async getKnowledgeCollections(): Promise<ApiResponse<KnowledgeCollection[]>> {
    return this.get<KnowledgeCollection[]>('/knowledge/collections');
  }

  /**
   * Obtiene una colección específica por ID
   */
  async getKnowledgeCollection(id: string): Promise<ApiResponse<KnowledgeCollection>> {
    return this.get<KnowledgeCollection>(`/knowledge/collections/${id}`);
  }

  /**
   * Crea una nueva colección de conocimiento
   */
  async createKnowledgeCollection(data: {
    name: string;
    description?: string;
    language: string;
  }): Promise<ApiResponse<KnowledgeCollection>> {
    return this.post<KnowledgeCollection>('/knowledge/collections', data);
  }

  /**
   * Actualiza una colección de conocimiento
   */
  async updateKnowledgeCollection(
    id: string,
    data: {
      name?: string;
      description?: string;
      language?: string;
    },
  ): Promise<ApiResponse<KnowledgeCollection>> {
    return this.put<KnowledgeCollection>(`/knowledge/collections/${id}`, data);
  }

  /**
   * Elimina una colección de conocimiento
   */
  async deleteKnowledgeCollection(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/knowledge/collections/${id}`);
  }

  /**
   * Obtiene todas las fuentes de conocimiento del tenant
   */
  async getKnowledgeSources(collectionId?: string): Promise<ApiResponse<KnowledgeSource[]>> {
    const query = collectionId ? `?collectionId=${collectionId}` : '';
    return this.get<KnowledgeSource[]>(`/knowledge/sources${query}`);
  }

  /**
   * Obtiene una fuente específica por ID
   */
  async getKnowledgeSource(id: string): Promise<ApiResponse<KnowledgeSource>> {
    return this.get<KnowledgeSource>(`/knowledge/sources/${id}`);
  }

  /**
   * Crea una nueva fuente de conocimiento
   */
  async createKnowledgeSource(data: {
    collectionId?: string;
    type: 'FAQ' | 'DOC' | 'URL_SCRAPE' | 'MANUAL_ENTRY' | 'CALENDAR' | 'CRM';
    title: string;
    language: string;
    content?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<KnowledgeSource>> {
    return this.post<KnowledgeSource>('/knowledge/sources', data);
  }

  /**
   * Actualiza una fuente de conocimiento
   */
  async updateKnowledgeSource(
    id: string,
    data: {
      collectionId?: string;
      type?: 'FAQ' | 'DOC' | 'URL_SCRAPE' | 'MANUAL_ENTRY' | 'CALENDAR' | 'CRM';
      title?: string;
      language?: string;
      content?: string;
      url?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<ApiResponse<KnowledgeSource>> {
    return this.put<KnowledgeSource>(`/knowledge/sources/${id}`, data);
  }

  /**
   * Elimina una fuente de conocimiento
   */
  async deleteKnowledgeSource(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/knowledge/sources/${id}`);
  }

  /**
   * Importa un documento
   */
  async importKnowledgeDocument(data: {
    collectionId?: string;
    title: string;
    language: string;
    documentUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<KnowledgeSource>> {
    return this.post<KnowledgeSource>('/knowledge/import/document', data);
  }

  /**
   * Importa contenido desde una URL
   */
  async importKnowledgeUrl(data: {
    collectionId?: string;
    title: string;
    language: string;
    url: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<KnowledgeSource>> {
    return this.post<KnowledgeSource>('/knowledge/import/url', data);
  }

  /**
   * Realiza una búsqueda semántica en la base de conocimiento
   */
  async searchKnowledgeBase(data: {
    query: string;
    language?: string;
    collectionId?: string;
    limit?: number;
  }): Promise<ApiResponse<{
    success: boolean;
    results: Array<{
      chunkId: string;
      sourceId: string;
      sourceTitle: string;
      collectionId?: string;
      collectionName?: string;
      content: string;
      similarity: number;
      chunkIndex: number;
      language?: string;
    }>;
    totalResults: number;
  }>> {
    return this.post('/knowledge/search', data);
  }

  // ============================================
  // n8n Flows
  // ============================================

  /**
   * Lista flujos n8n del tenant
   */
  async getN8nFlows(filters?: {
    agentId?: string;
    type?: 'LEAD_INTAKE' | 'BOOKING_FLOW' | 'FOLLOWUP' | 'PAYMENT_FAILED' | 'CUSTOM';
    isActive?: boolean;
  }): Promise<ApiResponse<N8nFlow[]>> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append('agentId', filters.agentId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    const query = params.toString();
    return this.get<N8nFlow[]>(`/n8n/flows${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un flujo n8n por ID
   */
  async getN8nFlow(id: string): Promise<ApiResponse<N8nFlow>> {
    return this.get<N8nFlow>(`/n8n/flows/${id}`);
  }

  /**
   * Crea un nuevo flujo n8n
   */
  async createN8nFlow(data: {
    agentId?: string;
    workflowId: string;
    type: 'LEAD_INTAKE' | 'BOOKING_FLOW' | 'FOLLOWUP' | 'PAYMENT_FAILED' | 'CUSTOM';
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<N8nFlow>> {
    return this.post<N8nFlow>('/n8n/flows', data);
  }

  /**
   * Actualiza un flujo n8n
   */
  async updateN8nFlow(
    id: string,
    data: {
      agentId?: string;
      workflowId?: string;
      type?: 'LEAD_INTAKE' | 'BOOKING_FLOW' | 'FOLLOWUP' | 'PAYMENT_FAILED' | 'CUSTOM';
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<ApiResponse<N8nFlow>> {
    return this.put<N8nFlow>(`/n8n/flows/${id}`, data);
  }

  /**
   * Elimina un flujo n8n
   */
  async deleteN8nFlow(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/n8n/flows/${id}`);
  }

  /**
   * Activa un flujo n8n
   */
  async activateN8nFlow(id: string): Promise<ApiResponse<N8nFlow>> {
    return this.put<N8nFlow>(`/n8n/flows/${id}/activate`, {});
  }

  /**
   * Desactiva un flujo n8n
   */
  async deactivateN8nFlow(id: string): Promise<ApiResponse<N8nFlow>> {
    return this.put<N8nFlow>(`/n8n/flows/${id}/deactivate`, {});
  }

  // Channels

  /**
   * Lista canales del tenant
   */
  async getChannels(filters?: {
    type?: 'WHATSAPP' | 'VOICE' | 'WEBCHAT' | 'TELEGRAM';
    status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  }): Promise<ApiResponse<Channel[]>> {
    const query = new URLSearchParams();
    if (filters?.type) query.append('type', filters.type);
    if (filters?.status) query.append('status', filters.status);
    return this.get<Channel[]>(`/channels${query.toString() ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un canal por ID
   */
  async getChannel(id: string): Promise<ApiResponse<Channel>> {
    return this.get<Channel>(`/channels/${id}`);
  }

  /**
   * Crea un nuevo canal
   */
  async createChannel(data: {
    type: 'WHATSAPP' | 'VOICE' | 'WEBCHAT' | 'TELEGRAM';
    name: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    config?: Record<string, unknown>;
  }): Promise<ApiResponse<Channel>> {
    return this.post<Channel>('/channels', data);
  }

  /**
   * Actualiza un canal
   */
  async updateChannel(
    id: string,
    data: {
      name?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
      config?: Record<string, unknown>;
    },
  ): Promise<ApiResponse<Channel>> {
    return this.put<Channel>(`/channels/${id}`, data);
  }

  /**
   * Elimina un canal
   */
  async deleteChannel(id: string): Promise<ApiResponse<{ id: string }>> {
    return this.delete<{ id: string }>(`/channels/${id}`);
  }

  /**
   * Agrega un agente a un canal
   */
  async addAgentToChannel(
    channelId: string,
    agentId: string,
  ): Promise<ApiResponse<{ id: string; channelId: string; agentId: string; agent: { id: string; name: string; status: string } }>> {
    return this.post(`/channels/${channelId}/agents`, { agentId });
  }

  /**
   * Elimina un agente de un canal
   */
  async removeAgentFromChannel(
    channelId: string,
    agentId: string,
  ): Promise<ApiResponse<{ channelId: string; agentId: string }>> {
    return this.delete<{ channelId: string; agentId: string }>(`/channels/${channelId}/agents/${agentId}`);
  }

  // GDPR

  /**
   * Obtiene el historial de consentimientos
   */
  async getConsents(userId?: string): Promise<ApiResponse<Array<{
    id: string;
    tenantId: string;
    userId?: string;
    consentType: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
  }>>> {
    return this.get(`/gdpr/consents${userId ? `?userId=${userId}` : ''}`);
  }

  /**
   * Registra un consentimiento
   */
  async createConsent(data: {
    consentType: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    userId?: string;
    consentType: string;
    granted: boolean;
    createdAt: string;
  }>> {
    return this.post('/gdpr/consents', data);
  }

  /**
   * Obtiene las políticas de retención
   */
  async getRetentionPolicies(): Promise<ApiResponse<Array<{
    id: string;
    tenantId: string;
    dataType: string;
    retentionDays: number;
    autoDelete: boolean;
    createdAt: string;
    updatedAt: string;
  }>>> {
    return this.get('/gdpr/retention-policies');
  }

  /**
   * Crea o actualiza una política de retención
   */
  async createRetentionPolicy(data: {
    dataType: string;
    retentionDays: number;
    autoDelete: boolean;
  }): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    dataType: string;
    retentionDays: number;
    autoDelete: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.post('/gdpr/retention-policies', data);
  }

  /**
   * Actualiza una política de retención
   */
  async updateRetentionPolicy(
    id: string,
    data: {
      retentionDays?: number;
      autoDelete?: boolean;
    },
  ): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    dataType: string;
    retentionDays: number;
    autoDelete: boolean;
    updatedAt: string;
  }>> {
    return this.put(`/gdpr/retention-policies/${id}`, data);
  }

  /**
   * Aplica las políticas de retención
   */
  async applyRetentionPolicies(): Promise<ApiResponse<{
    success: boolean;
    message: string;
  }>> {
    return this.post('/gdpr/apply-retention', {});
  }

  /**
   * Anonimiza un usuario
   */
  async anonymizeUser(
    userId: string,
    reason?: string,
  ): Promise<ApiResponse<{
    userId: string;
    anonymizedAt: string;
  }>> {
    return this.post(`/gdpr/anonymize/${userId}`, { reason });
  }

  /**
   * Exporta datos de un usuario
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<ApiResponse<{
    userId: string;
    format: string;
    data: Record<string, unknown>;
    exportedAt: string;
  }>> {
    return this.post(`/gdpr/export/${userId}`, { format });
  }

  /**
   * Elimina datos de un usuario (Right to be forgotten)
   */
  async deleteUserData(
    userId: string,
    reason?: string,
  ): Promise<ApiResponse<{
    userId: string;
    deletedAt: string;
  }>> {
    return this.post(`/gdpr/delete/${userId}`, { reason });
  }

  // Appointments

  /**
   * Lista citas del tenant
   */
  async getAppointments(filters?: {
    agentId?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Array<{
    id: string;
    tenantId: string;
    agentId: string;
    conversationId: string;
    calendarEventId?: string;
    participantPhone: string;
    participantName?: string;
    startTime: string;
    endTime: string;
    status: string;
    notes?: string;
    reminderSent: boolean;
    createdAt: string;
    updatedAt: string;
  }>>> {
    const query = new URLSearchParams();
    if (filters?.agentId) query.append('agentId', filters.agentId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    return this.get(`/appointments${query.toString() ? `?${query}` : ''}`);
  }

  /**
   * Obtiene citas en un rango de fechas (para calendario)
   */
  async getAppointmentsByRange(
    startDate: string,
    endDate: string,
    agentId?: string,
  ): Promise<ApiResponse<Array<{
    id: string;
    tenantId: string;
    agentId: string;
    conversationId: string;
    calendarEventId?: string;
    participantPhone: string;
    participantName?: string;
    startTime: string;
    endTime: string;
    status: string;
    notes?: string;
    reminderSent: boolean;
    createdAt: string;
    updatedAt: string;
    agent?: {
      id: string;
      name: string;
    };
    conversation?: {
      id: string;
      participantPhone: string;
      participantName?: string;
    };
  }>>> {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (agentId) {
      params.append('agentId', agentId);
    }
    return this.get(`/appointments/range?${params.toString()}`);
  }

  /**
   * Obtiene una cita por ID
   */
  async getAppointment(id: string): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    agentId: string;
    conversationId: string;
    calendarEventId?: string;
    participantPhone: string;
    participantName?: string;
    startTime: string;
    endTime: string;
    status: string;
    notes?: string;
    reminderSent: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.get(`/appointments/${id}`);
  }

  /**
   * Crea una nueva cita
   */
  async createAppointment(data: {
    agentId: string;
    conversationId: string;
    participantPhone: string;
    participantName?: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    agentId: string;
    conversationId: string;
    participantPhone: string;
    startTime: string;
    endTime: string;
    status: string;
    createdAt: string;
  }>> {
    return this.post('/appointments', data);
  }

  /**
   * Reagenda una cita
   */
  async rescheduleAppointment(
    id: string,
    data: {
      startTime: string;
      endTime: string;
    },
  ): Promise<ApiResponse<{
    id: string;
    startTime: string;
    endTime: string;
    updatedAt: string;
  }>> {
    return this.put(`/appointments/${id}/reschedule`, data);
  }

  /**
   * Cancela una cita
   */
  async cancelAppointment(
    id: string,
    reason?: string,
  ): Promise<ApiResponse<{
    id: string;
    status: string;
    updatedAt: string;
  }>> {
    return this.put(`/appointments/${id}/cancel`, { reason });
  }

  /**
   * Envía recordatorio de una cita
   */
  async sendAppointmentReminder(id: string): Promise<ApiResponse<{
    id: string;
    reminderSent: boolean;
  }>> {
    return this.post(`/appointments/${id}/reminder`, {});
  }

  // ============================================
  // Métodos para Analytics
  // ============================================

  /**
   * Obtiene los KPIs del dashboard
   */
  async getKPIs(): Promise<ApiResponse<{
    leads: { total: number; thisMonth: number };
    agents: { active: number; total: number };
    channels: { active: number; total: number };
    conversations: { active: number; total: number };
    messages: { total: number; thisMonth: number };
    responseRate: { averageMinutes: number; averageHours: number; formatted: string };
    responseTime: { averageMinutes: number; formatted: string };
  }>> {
    return this.get('/analytics/kpis');
  }

  /**
   * Obtiene todas las métricas combinadas
   */
  async getAnalyticsMetrics(filters: {
    startDate: string;
    endDate: string;
    agentId?: string;
    channelId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<{
    conversationsTrend: Array<{ date: string; count: number }>;
    messagesStats: { sent: number; received: number; byDay: Array<{ date: string; sent: number; received: number }> };
    responseTimes: Array<{ agentId: string; agentName: string; averageMinutes: number; responseCount: number }>;
    conversions: { leads: number; conversations: number; appointments: number; conversionRates: { leadToConversation: number; conversationToAppointment: number; overall: number } };
    agentsUsage: Array<{ agentId: string; agentName: string; channelId: string; channelName: string; count: number }>;
  }>> {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.channelId) params.append('channelId', filters.channelId);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    return this.get(`/analytics/metrics?${params.toString()}`);
  }

  /**
   * Obtiene tendencia de conversaciones
   */
  async getConversationsTrend(filters: {
    startDate: string;
    endDate: string;
    agentId?: string;
    channelId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<Array<{ date: string; count: number }>>> {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.channelId) params.append('channelId', filters.channelId);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    return this.get(`/analytics/conversations-trend?${params.toString()}`);
  }

  /**
   * Obtiene estadísticas de mensajes
   */
  async getMessagesStats(filters: {
    startDate: string;
    endDate: string;
    agentId?: string;
    channelId?: string;
  }): Promise<ApiResponse<{ sent: number; received: number; byDay: Array<{ date: string; sent: number; received: number }> }>> {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.channelId) params.append('channelId', filters.channelId);
    return this.get(`/analytics/messages-stats?${params.toString()}`);
  }

  /**
   * Obtiene tiempos de respuesta por agente
   */
  async getResponseTimes(filters: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<Array<{ agentId: string; agentName: string; averageMinutes: number; responseCount: number }>>> {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    return this.get(`/analytics/response-times?${params.toString()}`);
  }

  /**
   * Obtiene métricas de conversión
   */
  async getConversionMetrics(filters: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<{ leads: number; conversations: number; appointments: number; conversionRates: { leadToConversation: number; conversationToAppointment: number; overall: number } }>> {
    const params = new URLSearchParams();
    params.append('startDate', filters.startDate);
    params.append('endDate', filters.endDate);
    return this.get(`/analytics/conversions?${params.toString()}`);
  }

  /**
   * Exporta analytics a PDF
   */
  async exportAnalyticsPdf(filters: {
    startDate?: string;
    endDate?: string;
    agentId?: string;
    channelId?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.channelId) params.append('channelId', filters.channelId);

    const response = await fetch(`${API_BASE_URL}/api/analytics/export/pdf?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }

    return response.blob();
  }

  // ============================================
  // Métodos para Búsqueda Global
  // ============================================

  /**
   * Realiza una búsqueda global
   */
  async search(
    query: string,
    types?: string[],
    limit?: number,
  ): Promise<ApiResponse<{
    query: string;
    results: {
      conversations: Array<{
        id: string;
        type: string;
        title: string;
        description?: string;
        preview?: string;
        url: string;
      }>;
      messages: Array<{ id: string; type: string; title: string; preview?: string; url: string }>;
      appointments: Array<{ id: string; type: string; title: string; url: string }>;
      agents: Array<{ id: string; type: string; title: string; url: string }>;
      knowledge: Array<{ id: string; type: string; title: string; url: string }>;
    };
    total: number;
  }>> {
    const params = new URLSearchParams({ q: query });
    if (types && types.length > 0) {
      params.append('types', types.join(','));
    }
    if (limit) {
      params.append('limit', limit.toString());
    }
    return this.get(`/search?${params.toString()}`);
  }

  // ============================================
  // Métodos para Notificaciones
  // ============================================

  /**
   * Obtiene las notificaciones del usuario
   */
  async getNotifications(filters?: {
    limit?: number;
    offset?: number;
    read?: boolean;
  }): Promise<ApiResponse<{
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      actionUrl?: string;
      read: boolean;
      readAt?: string;
      metadata?: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>> {
    const query = new URLSearchParams();
    if (filters?.limit) query.append('limit', filters.limit.toString());
    if (filters?.offset) query.append('offset', filters.offset.toString());
    if (filters?.read !== undefined) query.append('read', filters.read.toString());
    return this.get(`/notifications${query.toString() ? `?${query}` : ''}`);
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get('/notifications/unread-count');
  }

  /**
   * Marca una notificación como leída
   */
  async markNotificationAsRead(id: string): Promise<ApiResponse<{
    id: string;
    read: boolean;
    readAt: string;
  }>> {
    return this.put(`/notifications/${id}/read`, {});
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllNotificationsAsRead(): Promise<ApiResponse<{ message: string }>> {
    return this.put('/notifications/read-all', {});
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/notifications/${id}`);
  }

  // ============================================
  // Métodos para Conversaciones
  // ============================================

  /**
   * Obtiene todas las conversaciones del tenant
   */
  async getConversations(filters?: {
    agentId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    data: Array<{
      id: string;
      tenantId: string;
      whatsappAccountId: string;
      agentId?: string;
      agent?: { id: string; name: string };
      participantPhone: string;
      participantName?: string;
      status: string;
      lastMessageAt?: string;
      unreadCount: number;
      messageCount: number;
      detectedLanguage?: string;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>> {
    const query = new URLSearchParams();
    if (filters?.agentId) query.append('agentId', filters.agentId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.limit) query.append('limit', filters.limit.toString());
    if (filters?.offset) query.append('offset', filters.offset.toString());
    return this.get(`/conversations${query.toString() ? `?${query}` : ''}`);
  }

  /**
   * Obtiene una conversación por ID
   */
  async getConversation(id: string): Promise<ApiResponse<{
    id: string;
    tenantId: string;
    whatsappAccountId: string;
    agentId?: string;
    agent?: { id: string; name: string; status: string };
    participantPhone: string;
    participantName?: string;
    status: string;
    lastMessageAt?: string;
    unreadCount: number;
    messageCount: number;
    detectedLanguage?: string;
    summary?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.get(`/conversations/${id}`);
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  async getConversationMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<{
    data: Array<{
      id: string;
      conversationId: string;
      tenantId: string;
      type: string;
      direction: string;
      content: string;
      status: string;
      providerMessageId?: string;
      metadata?: Record<string, unknown>;
      sentAt?: string;
      deliveredAt?: string;
      readAt?: string;
      language?: string;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>> {
    const query = new URLSearchParams();
    if (options?.limit) query.append('limit', options.limit.toString());
    if (options?.offset) query.append('offset', options.offset.toString());
    return this.get(`/conversations/${conversationId}/messages${query.toString() ? `?${query}` : ''}`);
  }

  /**
   * Envía un mensaje a una conversación
   */
  async sendConversationMessage(
    conversationId: string,
    content: string,
    type?: string
  ): Promise<ApiResponse<{
    id: string;
    conversationId: string;
    type: string;
    direction: string;
    content: string;
    status: string;
    createdAt: string;
  }>> {
    return this.post(`/conversations/${conversationId}/messages`, { content, type });
  }

  /**
   * Archiva una conversación
   */
  async archiveConversation(conversationId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post(`/conversations/${conversationId}/archive`, {});
  }

  /**
   * Desarchiva una conversación
   */
  async unarchiveConversation(conversationId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post(`/conversations/${conversationId}/unarchive`, {});
  }

  // ============================================
  // Métodos de Observabilidad y Utilidades
  // ============================================

  /**
   * Obtiene métricas de observabilidad de sesión
   * Útil para debugging y monitoreo
   */
  public getSessionMetrics(): {
    callCount: number;
    recentReasons: Array<{ timestamp: number; reason: string }>;
    circuitBreakerOpen: boolean;
    circuitBreakerOpenUntil: number | null;
    refreshFailureCount: number;
    refreshAttempts: number;
  } {
    return {
      callCount: this.sessionMeCallCount,
      recentReasons: this.sessionMeCallReasons.slice(-10), // Últimos 10
      circuitBreakerOpen: this.circuitBreakerOpen,
      circuitBreakerOpenUntil: this.circuitBreakerOpen ? this.circuitBreakerOpenUntil : null,
      refreshFailureCount: this.refreshFailureCount,
      refreshAttempts: this.refreshAttempts.length,
    };
  }

  /**
   * Verifica si el circuit breaker está abierto
   * Útil para mostrar mensajes al usuario
   */
  public isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) {
      return false;
    }
    
    // Si el cooldown terminó, resetear
    if (Date.now() >= this.circuitBreakerOpenUntil) {
      this.circuitBreakerOpen = false;
      this.refreshFailureCount = 0;
      this.refreshFailureWindowStart = 0;
      return false;
    }
    
    return true;
  }

  /**
   * Logout controlado cuando el circuit breaker está abierto
   * Limpia todos los caches y redirige a login sin loops
   */
  public async controlledLogout(router?: { push: (path: string) => void }): Promise<void> {
    // Limpiar todos los caches
    this.clearCaches();
    
    // Limpiar sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Log estructurado
    if (process.env.NODE_ENV === 'development') {
      console.log('[PERF][CLIENT] auth.controlled_logout', {
        reason: 'circuit_breaker_open',
        metrics: this.getSessionMetrics(),
      });
    }
    
    // Redirigir a login si se proporciona router
    if (router) {
      router.push('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
