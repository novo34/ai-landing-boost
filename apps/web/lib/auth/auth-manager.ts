/**
 * AuthManager - Single Source of Truth para autenticación
 * 
 * Implementa:
 * - Singleton pattern
 * - Single-flight pattern (Mutex)
 * - Cache con TTL
 * - Refresh token con cooldown
 * - Sistema de suscripciones
 * - Validación periódica
 * 
 * Alineado con AI-Spec: Session & Auth Stabilization
 */

import { Mutex } from './mutex';
import type { AuthState, User, Tenant, PlatformRole, SessionMeResponse } from './types';

// Importar apiClient de forma lazy para evitar dependencias circulares
let apiClient: any = null;

function getApiClient() {
  if (!apiClient && typeof window !== 'undefined') {
    // Dynamic import para evitar dependencias circulares
    apiClient = require('../api/client').apiClient;
  }
  return apiClient;
}

export class AuthManager {
  private static instance: AuthManager | null = null;
  
  private mutex = new Mutex();
  private cache: AuthState | null = null;
  private cacheTTL = 5 * 60 * 1000; // 5 minutos
  private subscribers = new Set<(state: AuthState) => void>();
  
  // Refresh token management
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshAttempt = 0;
  private readonly REFRESH_COOLDOWN = 60 * 1000; // 60 segundos
  
  // Promise cache para bootstrap (previene duplicados en StrictMode)
  private bootstrapPromise: Promise<AuthState> | null = null;
  
  private constructor() {
    // Constructor privado para singleton
  }

  /**
   * Obtiene la instancia única de AuthManager (Singleton)
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Bootstrap: Inicializa el estado de autenticación
   * Solo debe llamarse una vez al inicio de la aplicación
   * Usa promise cache para prevenir duplicados en React StrictMode
   */
  async bootstrap(): Promise<AuthState> {
    // Si ya hay un bootstrap en curso, retornar esa promise
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    // Verificar cache primero
    if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('[AuthManager] Bootstrap: Cache hit');
      }
      return this.cache;
    }

    // Crear promise y guardarla en cache
    this.bootstrapPromise = this.mutex.run(async () => {
      try {
        // Doble verificación después de adquirir lock
        if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[AuthManager] Bootstrap: Cache hit (double check)');
          }
          return this.cache;
        }

        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('[AuthManager] Bootstrap: Iniciando verificación...');
        }

        // Llamada HTTP a /session/me
        const client = getApiClient();
        if (!client) {
          throw new Error('ApiClient no disponible');
        }

        const response = await client.get<SessionMeResponse>('/session/me');

        if (response.success && response.data) {
          const sessionData = response.data;
          
          // Construir estado autenticado
          const state: AuthState = {
            isAuthenticated: true,
            user: sessionData.user,
            tenant: sessionData.currentTenant ? {
              id: sessionData.currentTenant.tenantId,
              name: sessionData.currentTenant.name,
              status: sessionData.currentTenant.status,
              role: sessionData.currentTenant.role,
            } : null,
            platformRole: sessionData.platformRole || null,
            lastChecked: Date.now(),
            expiresAt: Date.now() + this.cacheTTL,
          };

          // Guardar tenantId en sessionStorage para futuras peticiones
          if (typeof window !== 'undefined' && state.tenant) {
            sessionStorage.setItem('currentTenantId', state.tenant.id);
          }

          this.cache = state;
          this.notifySubscribers(state);

          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[AuthManager] Bootstrap: Autenticado exitosamente', {
              userId: state.user?.id,
              tenantId: state.tenant?.id,
            });
          }

          return state;
        } else {
          // No autenticado
          const state: AuthState = {
            isAuthenticated: false,
            user: null,
            tenant: null,
            platformRole: null,
            lastChecked: Date.now(),
            expiresAt: Date.now(),
          };

          this.cache = state;
          this.notifySubscribers(state);

          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[AuthManager] Bootstrap: No autenticado');
          }

          return state;
        }
      } catch (error) {
        console.error('[AuthManager] Bootstrap: Error', error);
        
        // En caso de error, retornar estado no autenticado
        const state: AuthState = {
          isAuthenticated: false,
          user: null,
          tenant: null,
          platformRole: null,
          lastChecked: Date.now(),
          expiresAt: Date.now(),
        };

        this.cache = state;
        this.notifySubscribers(state);
        return state;
      } finally {
        // Limpiar promise cache después de completar
        this.bootstrapPromise = null;
      }
    });

    return this.bootstrapPromise;
  }

  /**
   * Valida el estado actual (silencioso, no bloquea UI)
   * Útil para validación periódica
   */
  async validate(): Promise<AuthState> {
    // Si cache es válido, retornar sin hacer request
    if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
      return this.cache;
    }

    // Si hay bootstrap en curso, esperarlo
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }

    // Hacer nueva verificación (usa mutex para single-flight)
    return this.mutex.run(async () => {
      // Doble verificación
      if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
        return this.cache;
      }

      const client = getApiClient();
      if (!client) {
        return this.getState();
      }

      try {
        const response = await client.get<SessionMeResponse>('/session/me');

        if (response.success && response.data) {
          const sessionData = response.data;
          const state: AuthState = {
            isAuthenticated: true,
            user: sessionData.user,
            tenant: sessionData.currentTenant ? {
              id: sessionData.currentTenant.tenantId,
              name: sessionData.currentTenant.name,
              status: sessionData.currentTenant.status,
              role: sessionData.currentTenant.role,
            } : null,
            platformRole: sessionData.platformRole || null,
            lastChecked: Date.now(),
            expiresAt: Date.now() + this.cacheTTL,
          };

          if (typeof window !== 'undefined' && state.tenant) {
            sessionStorage.setItem('currentTenantId', state.tenant.id);
          }

          this.cache = state;
          this.notifySubscribers(state);
          return state;
        } else {
          const state: AuthState = {
            isAuthenticated: false,
            user: null,
            tenant: null,
            platformRole: null,
            lastChecked: Date.now(),
            expiresAt: Date.now(),
          };
          this.cache = state;
          this.notifySubscribers(state);
          return state;
        }
      } catch (error) {
        console.error('[AuthManager] Validate: Error', error);
        return this.getState();
      }
    });
  }

  /**
   * Refresca el token de acceso
   * Implementa cooldown para prevenir refresh loops
   */
  async refreshToken(): Promise<boolean> {
    const now = Date.now();

    // Si ya hay un refresh en curso, esperarlo
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Verificar cooldown
    if (now - this.lastRefreshAttempt < this.REFRESH_COOLDOWN) {
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.warn('[AuthManager] Refresh en cooldown, esperando...', {
          remaining: Math.ceil((this.REFRESH_COOLDOWN - (now - this.lastRefreshAttempt)) / 1000),
        });
      }
      return false;
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = now;

    this.refreshPromise = (async () => {
      try {
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('[AuthManager] Refresh: Iniciando...');
        }

        const response = await fetch('/api/proxy/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          // Invalidar cache para forzar nueva verificación
          this.invalidateCache();
          
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[AuthManager] Refresh: Exitoso');
          }
          
          return true;
        } else {
          // Refresh falló, hacer logout
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.warn('[AuthManager] Refresh: Falló, haciendo logout');
          }
          
          await this.logout();
          return false;
        }
      } catch (error) {
        console.error('[AuthManager] Refresh: Error', error);
        await this.logout();
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Cierra sesión
   */
  async logout(): Promise<void> {
    const client = getApiClient();
    
    try {
      // Intentar llamar al endpoint de logout
      if (client) {
        await client.logout().catch((error: any) => {
          console.warn('[AuthManager] Logout: Error al llamar endpoint (continuando con limpieza local)', error);
        });
      } else {
        // Si no hay client, intentar directamente
        await fetch('/api/proxy/auth/logout', {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {
          // Ignorar errores
        });
      }
    } catch (error) {
      console.warn('[AuthManager] Logout: Error (continuando con limpieza local)', error);
    }

    // Limpiar estado local
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }

    // Invalidar cache
    this.invalidateCache();

    // Notificar a suscriptores
    const state: AuthState = {
      isAuthenticated: false,
      user: null,
      tenant: null,
      platformRole: null,
      lastChecked: Date.now(),
      expiresAt: Date.now(),
    };

    this.cache = state;
    this.notifySubscribers(state);

    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log('[AuthManager] Logout: Completado');
    }
  }

  /**
   * Obtiene el estado actual (síncrono, desde cache)
   */
  getState(): AuthState {
    if (this.cache) {
      return this.cache;
    }

    // Estado inicial si no hay cache
    return {
      isAuthenticated: false,
      user: null,
      tenant: null,
      platformRole: null,
      lastChecked: 0,
      expiresAt: 0,
    };
  }

  /**
   * Suscribe a cambios de estado
   * @param callback Función que se ejecuta cuando cambia el estado
   * @returns Función para desuscribirse
   */
  subscribe(callback: (state: AuthState) => void): () => void {
    this.subscribers.add(callback);

    // Ejecutar callback inmediatamente con estado actual
    callback(this.getState());

    // Retornar función de cleanup
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Invalida el cache (útil después de cambios importantes)
   */
  invalidateCache(): void {
    this.cache = null;
    this.bootstrapPromise = null;
    
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log('[AuthManager] Cache invalidado');
    }
  }

  /**
   * Notifica a todos los suscriptores
   */
  private notifySubscribers(state: AuthState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[AuthManager] Error en subscriber:', error);
      }
    });
  }
}


