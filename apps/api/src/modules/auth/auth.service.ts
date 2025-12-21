import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { $Enums } from '@prisma/client';
import { GoogleProfile } from './strategies/google.strategy';
import { MicrosoftProfile } from './strategies/microsoft.strategy';
import { EncryptionUtil } from '../whatsapp/utils/encryption.util';
import { N8nEventService } from '../n8n-integration/services/n8n-event.service';
import { createData } from '../../common/prisma/create-data.helper';
import { CacheService } from '../../common/cache/cache.service';
import { EmailDeliveryService } from '../email/email-delivery.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailDeliveryService: EmailDeliveryService,
    private n8nEventService: N8nEventService,
    private cacheService: CacheService,
  ) {}

  async register(dto: RegisterDto): Promise<{ success: boolean; data: UserInfo; tokens: AuthTokens }> {
    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        success: false,
        error_key: 'auth.email_already_exists',
      });
    }

    // Hash de la contraseña con coste adecuado (12 para producción, 10 para desarrollo)
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    // Crear usuario, tenant inicial y membership en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.user.create({
        data: createData({
          email: dto.email,
          passwordHash,
          name: dto.name,
          locale: 'es-ES', // Por defecto
        }),
      });

      // Generar slug del tenant desde el nombre o email
      const tenantSlug = this.generateSlug(dto.tenantName || dto.email.split('@')[0]);

      // Verificar que el slug no exista
      const existingTenant = await tx.tenant.findUnique({
        where: { slug: tenantSlug },
      });

      if (existingTenant) {
        throw new ConflictException({
          success: false,
          error_key: 'auth.tenant_slug_exists',
        });
      }

      // Crear tenant inicial
      const tenant = await tx.tenant.create({
        data: createData({
          name: dto.tenantName || `${dto.name || 'Mi Empresa'}`,
          slug: tenantSlug,
          country: 'ES', // Por defecto
          defaultLocale: 'es-ES',
          dataRegion: 'EU',
          status: $Enums.tenant_status.TRIAL,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días de prueba
        }),
      });

      // Crear membership con rol OWNER
      await tx.tenantmembership.create({
        data: createData({
          userId: user.id,
          tenantId: tenant.id,
          role: $Enums.tenantmembership_role.OWNER,
        }),
      });

      return { user, tenant };
    });

    // Enviar email de verificación
    try {
      await this.sendVerificationEmail(result.user.id);
    } catch (error) {
      this.logger.warn(`Failed to send verification email: ${error.message}`);
      // No fallar el registro si el email falla
    }

    // Emitir evento n8n de usuario registrado
    try {
      await this.n8nEventService.emitUserRegistered(result.tenant.id, {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        method: 'email',
      });
    } catch (error) {
      this.logger.warn(`Failed to emit user_registered event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Generar tokens
    const tokens = await this.generateTokens(result.user.id, result.user.email, result.tenant.id);

    return {
      success: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || undefined,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<{ success: boolean; data: UserInfo; tokens: AuthTokens }> {
    this.logger.log(`🔐 Login iniciado para: ${dto.email}`);
    
    try {
      this.logger.log('📊 Buscando usuario en BD...');
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: {
          tenantmembership: {
            include: {
              tenant: true,
            },
          },
        },
      });
      this.logger.log(`👤 Usuario encontrado: ${user ? 'Sí' : 'No'}`);

    if (!user) {
      this.logger.warn(`❌ Usuario no encontrado: ${dto.email}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.invalid_credentials',
      });
    }

    // Verificar contraseña
    if (!user.passwordHash) {
      this.logger.warn(`❌ Usuario sin passwordHash: ${dto.email}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.password_not_set',
      });
    }

    this.logger.log('🔑 Verificando contraseña...');
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    this.logger.log(`🔑 Contraseña válida: ${isPasswordValid ? 'Sí' : 'No'}`);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.invalid_credentials',
      });
    }

    // Obtener el primer tenant activo (o el primero disponible)
    const activeMembership = user.tenantmembership.find(
      (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
    ) || user.tenantmembership[0];

    if (!activeMembership) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.no_tenant_available',
      });
    }

    // Generar tokens
    this.logger.log(`🎫 Generando tokens para tenant: ${activeMembership.tenantId}`);
    const tokens = await this.generateTokens(user.id, user.email, activeMembership.tenantId);
    this.logger.log(`✅ Login exitoso para: ${dto.email}`);

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
      tokens,
    };
    } catch (error) {
      this.logger.error(`❌ Error en login para ${dto.email}:`, error);
      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<{ success: boolean; tokens: AuthTokens }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

            const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          tenantmembership: {
            where: {
              tenantId: payload.tenantId,
            },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.user_not_found',
        });
      }

      // Rotación de refresh token (generar nuevos tokens)
      const tenantId = payload.tenantId || user.tenantmembership[0]?.tenantId;
      if (!tenantId) {
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.no_tenant_available',
        });
      }

      const tokens = await this.generateTokens(user.id, user.email, tenantId);

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.invalid_refresh_token',
      });
    }
  }

  async logout(): Promise<{ success: boolean }> {
    // Los tokens se invalidan al limpiar las cookies en el controller
    // En el futuro, si se persisten refresh tokens en BD, aquí se marcarían como revocados
    return { success: true };
  }

  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
  ): Promise<AuthTokens> {
    const payload = {
      sub: userId,
      email,
      tenantId,
    };

    // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
      .substring(0, 50); // Limitar longitud
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<{ success: boolean; data: UserInfo; tokens: AuthTokens }> {
    this.logger.log(`[SSO Google] Attempting login for email: ${profile.email}, providerId: ${profile.id}`);
    
    // 1. Buscar identidad SSO existente
    let identity = await this.prisma.useridentity.findUnique({
      where: {
        provider_providerId: {
          provider: 'GOOGLE',
          providerId: profile.id,
        },
      },
      include: { user: { include: { tenantmembership: { include: { tenant: true } } } } },
    });

    let user;
    let tenantId: string;

    // 2. Si no existe, buscar por email
    if (!identity) {
            user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { tenantmembership: { include: { tenant: true } } },
      });

      if (user) {
        // Asociar SSO a usuario existente
        // Encriptar tokens OAuth antes de guardar
        const encryptedAccessToken = profile.accessToken ? EncryptionUtil.encrypt(profile.accessToken) : null;
        const encryptedRefreshToken = profile.refreshToken ? EncryptionUtil.encrypt(profile.refreshToken) : null;
        
        identity = await this.prisma.useridentity.create({
          data: createData({
            userId: user.id,
            provider: 'GOOGLE',
            providerId: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
          }),
          include: { user: { include: { tenantmembership: { include: { tenant: true } } } } },
        });

        // Obtener tenantId del usuario existente
        const activeMembership = user.tenantmembership.find(
          (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
        ) || user.tenantmembership[0];
        tenantId = activeMembership?.tenantId;

        // Emitir evento n8n de SSO vinculado
        if (tenantId) {
          try {
            await this.n8nEventService.emitSSOLinked(tenantId, {
              userId: user.id,
              email: user.email,
              provider: 'GOOGLE',
            });
            this.logger.log(`[SSO Google] Identity linked to existing user: ${user.email}, userId: ${user.id}`);
          } catch (error) {
            this.logger.warn(`Failed to emit sso_linked event: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        // Crear nuevo usuario y tenant
        const result = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: createData({
              email: profile.email,
              name: profile.name,
              emailVerified: true, // Google ya verifica email
            }),
          });

          const tenantSlug = this.generateSlug(profile.email.split('@')[0]);
          const tenant = await tx.tenant.create({
            data: createData({
              name: profile.name || 'Mi Empresa',
              slug: tenantSlug,
              country: 'ES',
              defaultLocale: 'es-ES',
              dataRegion: 'EU',
              status: $Enums.tenant_status.TRIAL,
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }),
          });

          await tx.tenantmembership.create({
            data: createData({
              userId: newUser.id,
              tenantId: tenant.id,
              role: $Enums.tenantmembership_role.OWNER,
            }),
          });

          // Encriptar tokens OAuth antes de guardar
          const encryptedAccessToken = profile.accessToken ? EncryptionUtil.encrypt(profile.accessToken) : null;
          const encryptedRefreshToken = profile.refreshToken ? EncryptionUtil.encrypt(profile.refreshToken) : null;

          const newIdentity = await tx.useridentity.create({
            data: createData({
              userId: newUser.id,
              provider: 'GOOGLE',
              providerId: profile.id,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
            }),
          });

          return { user: newUser, tenant, identity: newIdentity };
        });

        user = result.user;
        tenantId = result.tenant.id;

        // Emitir evento n8n de usuario registrado (SSO Google)
        try {
          await this.n8nEventService.emitUserRegistered(result.tenant.id, {
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            method: 'google',
          });
        } catch (error) {
          this.logger.warn(`Failed to emit user_registered event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    if (!user) {
      user = identity.user;
    }

    // Obtener tenant activo
    if (!tenantId) {
      const activeMembership = user.tenantmembership.find(
        (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
      ) || user.tenantmembership[0];

      if (!activeMembership) {
        throw new BadRequestException({
          success: false,
          error_key: 'auth.no_tenant_available',
        });
      }

      tenantId = activeMembership.tenantId;
    }

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, tenantId);

    this.logger.log(`[SSO Google] Login successful for email: ${profile.email}, userId: ${user.id}, tenantId: ${tenantId}`);
    
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
      tokens,
    };
  }

  async loginWithMicrosoft(profile: MicrosoftProfile): Promise<{ success: boolean; data: UserInfo; tokens: AuthTokens }> {
    this.logger.log(`[SSO Microsoft] Attempting login for email: ${profile.email}, providerId: ${profile.id}`);
    // Similar a loginWithGoogle pero con provider 'MICROSOFT'
    let identity = await this.prisma.useridentity.findUnique({
      where: {
        provider_providerId: {
          provider: 'MICROSOFT',
          providerId: profile.id,
        },
      },
      include: { user: { include: { tenantmembership: { include: { tenant: true } } } } },
    });

    let user;
    let tenantId: string;

    if (!identity) {
            user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { tenantmembership: { include: { tenant: true } } },
      });

      if (user) {
        // Encriptar tokens OAuth antes de guardar
        const encryptedAccessToken = profile.accessToken ? EncryptionUtil.encrypt(profile.accessToken) : null;
        const encryptedRefreshToken = profile.refreshToken ? EncryptionUtil.encrypt(profile.refreshToken) : null;
        
        identity = await this.prisma.useridentity.create({
          data: createData({
            userId: user.id,
            provider: 'MICROSOFT',
            providerId: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
          }),
          include: { user: { include: { tenantmembership: { include: { tenant: true } } } } },
        });

        // Obtener tenantId del usuario existente
        const activeMembership = user.tenantmembership.find(
          (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
        ) || user.tenantmembership[0];
        tenantId = activeMembership?.tenantId;

        // Emitir evento n8n de SSO vinculado
        if (tenantId) {
          try {
            await this.n8nEventService.emitSSOLinked(tenantId, {
              userId: user.id,
              email: user.email,
              provider: 'MICROSOFT',
            });
            this.logger.log(`[SSO Microsoft] Identity linked to existing user: ${user.email}, userId: ${user.id}`);
          } catch (error) {
            this.logger.warn(`Failed to emit sso_linked event: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
                const result = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: createData({
              email: profile.email,
              name: profile.name,
              emailVerified: true,
            }),
          });

          const tenantSlug = this.generateSlug(profile.email.split('@')[0]);
          const tenant = await tx.tenant.create({
            data: createData({
              name: profile.name || 'Mi Empresa',
              slug: tenantSlug,
              country: 'ES',
              defaultLocale: 'es-ES',
              dataRegion: 'EU',
              status: $Enums.tenant_status.TRIAL,
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }),
          });

          await tx.tenantmembership.create({
            data: createData({
              userId: newUser.id,
              tenantId: tenant.id,
              role: $Enums.tenantmembership_role.OWNER,
            }),
          });

          // Encriptar tokens OAuth antes de guardar
          const encryptedAccessToken = profile.accessToken ? EncryptionUtil.encrypt(profile.accessToken) : null;
          const encryptedRefreshToken = profile.refreshToken ? EncryptionUtil.encrypt(profile.refreshToken) : null;
          
          const newIdentity = await tx.useridentity.create({
            data: createData({
              userId: newUser.id,
              provider: 'MICROSOFT',
              providerId: profile.id,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
            }),
          });

          return { user: newUser, tenant, identity: newIdentity };
        });

        user = result.user;
        tenantId = result.tenant.id;

        // Emitir evento n8n de usuario registrado (SSO Microsoft)
        try {
          await this.n8nEventService.emitUserRegistered(result.tenant.id, {
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
            method: 'microsoft',
          });
          this.logger.log(`[SSO Microsoft] New user registered: ${result.user.email}, userId: ${result.user.id}`);
        } catch (error) {
          this.logger.warn(`Failed to emit user_registered event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    if (!user) {
      user = identity.user;
    }

    if (!tenantId) {
      const activeMembership = user.tenantmembership.find(
        (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
      ) || user.tenantmembership[0];

      if (!activeMembership) {
        throw new BadRequestException({
          success: false,
          error_key: 'auth.no_tenant_available',
        });
      }

      tenantId = activeMembership.tenantId;
    }

    const tokens = await this.generateTokens(user.id, user.email, tenantId);

    this.logger.log(`[SSO Microsoft] Login successful for email: ${profile.email}, userId: ${user.id}, tenantId: ${tenantId}`);
    
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
      tokens,
    };
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantmembership: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    
    if (!user) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.user_not_found',
        message: 'User not found',
      });
    }
    
    if (user.emailVerified) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.email_already_verified',
        message: 'Email is already verified',
      });
    }

    // Obtener tenantId del primer membership (o el tenant por defecto)
    const tenantId = user.tenantmembership[0]?.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.user_has_no_tenant',
        message: 'User has no tenant membership',
      });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Guardar o actualizar token
    await this.prisma.emailverification.upsert({
      where: { userId },
      update: { token, expiresAt },
      create: createData({ userId, token, expiresAt }),
    });

    // Encolar email de verificación con tenantId para branding
    // Si el servicio de email no está configurado, no fallar pero loguear advertencia
    try {
      await this.emailDeliveryService.queueVerificationEmail(
        user.email,
        token,
        tenantId,
        user.name || undefined,
        user.locale,
      );
    } catch (error) {
      // Si falla el envío de email, loguear pero no fallar la operación
      // El token ya está guardado, el usuario puede usar el link manualmente
      this.logger.warn(`Failed to queue verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // No lanzar error para que el endpoint retorne éxito
      // El token está guardado y puede ser usado manualmente
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const verification = await this.prisma.emailverification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || verification.expiresAt < new Date()) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.invalid_verification_token',
      });
    }

    // Obtener tenantId antes de actualizar
    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
      include: {
        tenantmembership: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const tenantId = user?.tenantmembership[0]?.tenantId;

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    await this.prisma.emailverification.delete({
      where: { id: verification.id },
    });

    // Invalidar cache de sesión para este usuario (importante para que el frontend vea el cambio)
    this.cacheService.invalidateUserCache(verification.userId);
    this.logger.log(`Cache invalidado para usuario ${verification.userId} después de verificar email`);

    // Emitir evento n8n de email verificado
    if (tenantId) {
      try {
        await this.n8nEventService.emitEmailVerified(tenantId, {
          userId: verification.userId,
          email: verification.user.email,
        });
      } catch (error) {
        this.logger.warn(`Failed to emit email_verified event: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success: true };
  }
}

