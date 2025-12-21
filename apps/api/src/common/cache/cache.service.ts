import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Obtiene un valor del cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Guarda un valor en el cache con TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  /**
   * Elimina un valor del cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalida todas las entradas de cache relacionadas con un userId
   * Útil cuando se actualiza información del usuario (ej: emailVerified)
   */
  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      // Invalidar cache de sesión: session:{userId}:{tenantId}
      if (key.startsWith(`session:${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}


