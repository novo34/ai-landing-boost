/**
 * Tipos TypeScript para el sistema de autenticación
 * Alineado con AI-Spec: Session & Auth Stabilization
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  locale?: string;
  timeZone?: string;
  emailVerified?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  status: string;
  role: string;
}

export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tenant: Tenant | null;
  platformRole: PlatformRole;
  lastChecked: number;
  expiresAt: number;
}

export interface SessionMeResponse {
  user: User;
  platformRole?: PlatformRole;
  currentTenant: {
    tenantId: string;
    name: string;
    slug: string;
    status: string;
    role: string;
  } | null;
  tenants?: Array<{
    tenantId: string;
    name: string;
    slug: string;
    status: string;
    role: string;
  }>;
}


