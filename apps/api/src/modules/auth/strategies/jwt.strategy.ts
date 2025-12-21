import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId?: string; // tenant actual (opcional, puede venir del header)
  iat?: number;
  exp?: number;
}

// Extractor personalizado: primero cookies, luego Authorization header
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['access_token'] || null;
  }
  return null;
};

const fromAuthHeaderOrCookie = (req: Request): string | null => {
  // Primero intentar desde cookie
  const tokenFromCookie = cookieExtractor(req);
  if (tokenFromCookie) {
    return tokenFromCookie;
  }
  // Fallback a Authorization header (para compatibilidad)
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: fromAuthHeaderOrCookie,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenantmembership: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.user_not_found',
      });
    }

    // Incluir tenantId del JWT payload como fuente de verdad
    // Esto permite que los guards y servicios sepan qué tenant está activo
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: payload.tenantId, // Tenant activo del JWT
      tenantmembership: user.tenantmembership,
    };
  }
}

