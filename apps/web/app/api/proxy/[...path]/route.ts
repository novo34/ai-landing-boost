import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_BASE = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:3001";

/**
 * Verifica si estamos usando ngrok
 */
function isNgrokRequest(req: Request): boolean {
  const hostname = new URL(req.url).hostname;
  return hostname.includes('ngrok') || 
         hostname.includes('ngrok-free') || 
         hostname.includes('ngrok.io');
}

/**
 * Valida la seguridad de la petición cuando se usa ngrok
 */
function validateNgrokSecurity(req: Request): { allowed: boolean; reason?: string } {
  if (!isNgrokRequest(req)) {
    return { allowed: true };
  }
  
  // En desarrollo con ngrok, verificar autenticación básica si está configurada
  const authUser = process.env.NGROK_AUTH_USER;
  const authPass = process.env.NGROK_AUTH_PASS;
  
  if (authUser && authPass) {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return { 
        allowed: false, 
        reason: 'Autenticación básica requerida para ngrok' 
      };
    }
    
    // Verificar credenciales
    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');
    
    if (user !== authUser || pass !== authPass) {
      return { 
        allowed: false, 
        reason: 'Credenciales inválidas' 
      };
    }
  }
  
  // Verificar lista blanca de IPs si está configurada
  const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim());
  if (allowedIPs && allowedIPs.length > 0 && !allowedIPs.includes('*')) {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    req.headers.get('x-real-ip') ||
                    'unknown';
    
    if (!allowedIPs.includes(clientIP)) {
      return { 
        allowed: false, 
        reason: 'IP no autorizada' 
      };
    }
  }
  
  return { allowed: true };
}

async function handler(req: Request, path: string[]) {
  try {
    // Validar seguridad para ngrok
    const securityCheck = validateNgrokSecurity(req);
    if (!securityCheck.allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Acceso denegado', 
          reason: securityCheck.reason,
          message: 'Este endpoint requiere autenticación cuando se accede a través de ngrok'
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const incoming = new URL(req.url);
    // Construir la URL del backend correctamente
    const backendBase = BACKEND_BASE.endsWith("/") ? BACKEND_BASE.slice(0, -1) : BACKEND_BASE;
    const pathStr = path.join("/");
    
    // Asegurar que la URL base termine con / para que new URL funcione correctamente
    const baseUrl = backendBase.endsWith("/") ? backendBase : backendBase + "/";
    const target = new URL(pathStr, baseUrl);
    incoming.searchParams.forEach((v, k) => target.searchParams.append(k, v));
    
    // Validar que la URL sea válida
    if (!target.href || target.href === 'null' || target.href === 'undefined') {
      throw new Error(`URL inválida construida: base=${baseUrl}, path=${pathStr}`);
    }

    // Debug en desarrollo
    if (process.env.NODE_ENV === "development") {
      const isNgrok = isNgrokRequest(req);
      console.log(`[Proxy] ${req.method} ${pathStr} -> ${target.toString()}${isNgrok ? ' [NGROK]' : ''}`);
    }

    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("content-length");

    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    // Asegurar que x-tenant-id se preserve (importante para RBAC)
    const tenantId = req.headers.get("x-tenant-id");
    if (tenantId) {
      headers.set("x-tenant-id", tenantId);
    }

    // Debug en desarrollo
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEBUG_API === "true") {
      console.log(`[Proxy] Headers enviados al backend:`, {
        "x-tenant-id": tenantId || "no presente",
        path: pathStr,
        method: req.method,
        allHeaders: Object.fromEntries(headers.entries()),
      });
    }

    try {
      // Preparar el body solo para métodos que lo requieren
      let body: ArrayBuffer | undefined = undefined;
      if (!["GET", "HEAD"].includes(req.method)) {
        try {
          body = await req.arrayBuffer();
        } catch (bodyError) {
          // Si hay error al leer el body, continuar sin él
          if (process.env.NODE_ENV === "development") {
            console.warn(`[Proxy] Error al leer body de ${req.method} ${pathStr}:`, bodyError);
          }
        }
      }

      const res = await fetch(target.toString(), {
        method: req.method,
        headers,
        body,
        redirect: "manual",
        credentials: "include", // CRÍTICO: Preservar cookies HttpOnly (access_token, refresh_token)
      });

      const outHeaders = new Headers(res.headers);
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) outHeaders.set("set-cookie", setCookie);

      return new NextResponse(res.body, { status: res.status, headers: outHeaders });
    } catch (fetchError) {
      // Error al conectar con el backend
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      
      if (process.env.NODE_ENV === "development") {
        console.error(`[Proxy] Error al conectar con backend ${target.toString()}:`, errorMessage);
      }
      
      // Determinar el tipo de error
      let status = 500;
      let message = 'Error interno del servidor';
      
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        status = 503; // Service Unavailable
        message = 'El backend no está disponible. Verifica que esté corriendo en ' + BACKEND_BASE;
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        status = 504; // Gateway Timeout
        message = 'Timeout al conectar con el backend';
      }
      
      return new NextResponse(
        JSON.stringify({ 
          error: message,
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
          backend: BACKEND_BASE
        }),
        { 
          status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    // Error inesperado en el handler
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (process.env.NODE_ENV === "development") {
      console.error('[Proxy] Error inesperado en handler:', error);
    }
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error interno del proxy',
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handler(req, path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handler(req, path);
}
export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handler(req, path);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handler(req, path);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handler(req, path);
}
