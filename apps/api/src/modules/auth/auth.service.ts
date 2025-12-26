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
import { CryptoService } from '../crypto/crypto.service';
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
    private cryptoService: CryptoService,
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
      // ✅ JWT_REFRESH_SECRET es obligatorio (validado en validateEnv)
      const refreshSecret = process.env.JWT_REFRESH_SECRET!;
      
      // 1. Verificar firma JWT
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      // 2. Verificar token en BD (hash SHA-256)
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenRecord = await this.prisma.refreshtoken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              tenantmembership: {
                where: {
                  tenantId: payload.tenantId,
                },
                take: 1,
              },
            },
          },
        },
      });

      // 3. Validar que el token existe en BD
      if (!tokenRecord) {
        this.logger.warn(`Refresh token no encontrado en BD para hash: ${tokenHash.substring(0, 8)}...`);
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.refresh_token_not_found',
        });
      }

      // 4. Validar que no esté revocado
      if (tokenRecord.revokedAt) {
        this.logger.warn(`Refresh token revocado intentó usarse para usuario ${tokenRecord.userId}`);
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.refresh_token_revoked',
        });
      }

      // 5. Validar que no haya expirado
      if (tokenRecord.expiresAt < new Date()) {
        this.logger.warn(`Refresh token expirado intentó usarse para usuario ${tokenRecord.userId}`);
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.refresh_token_expired',
        });
      }

      // 6. Validar que el usuario existe
      const user = tokenRecord.user;
      if (!user) {
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.user_not_found',
        });
      }

      // 7. Validar tenant
      const tenantId = payload.tenantId || user.tenantmembership[0]?.tenantId;
      if (!tenantId) {
        throw new UnauthorizedException({
          success: false,
          error_key: 'auth.no_tenant_available',
        });
      }

      // 8. ✅ Rotación real: generar nuevos tokens y revocar el anterior
      const newTokens = await this.generateTokens(user.id, user.email, tenantId);
      
      // Obtener el ID del nuevo token para la rotación
      const newTokenHash = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
      const newTokenRecord = await this.prisma.refreshtoken.findUnique({
        where: { tokenHash: newTokenHash },
      });

      // Revocar el token anterior y marcar que fue reemplazado
      await this.prisma.refreshtoken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newTokenRecord?.id || null,
        },
      });

      this.logger.log(
        `Refresh token rotado para usuario ${user.id}, token anterior revocado: ${tokenRecord.id}`
      );

      return {
        success: true,
        tokens: newTokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Error en refresh: ${error.message}`, error.stack);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.invalid_refresh_token',
      });
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    try {
      if (refreshToken) {
        // ✅ Revocar token específico
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        const tokenRecord = await this.prisma.refreshtoken.findUnique({
          where: { tokenHash },
        });

        if (tokenRecord && tokenRecord.userId === userId && !tokenRecord.revokedAt) {
          await this.prisma.refreshtoken.update({
            where: { id: tokenRecord.id },
            data: { revokedAt: new Date() },
          });

          this.logger.log(`Refresh token revocado para usuario ${userId}, motivo: logout`);
        }
      } else {
        // ✅ Revocar todos los tokens activos del usuario
        const result = await this.prisma.refreshtoken.updateMany({
          where: {
            userId,
            revokedAt: null, // Solo tokens activos
          },
          data: {
            revokedAt: new Date(),
          },
        });

        this.logger.log(
          `Todos los refresh tokens revocados para usuario ${userId}, cantidad: ${result.count}, motivo: logout`
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error en logout: ${error.message}`, error.stack);
      // No fallar el logout si hay error, solo loguear
      return { success: true };
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
  ): Promise<AuthTokens> {
    // Crear jti (JWT ID) único para cada refresh token
    const jti = randomUUID();
    
    const payload = {
      sub: userId,
      email,
      tenantId,
      jti, // JWT ID único
    };

    // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    // ✅ JWT_REFRESH_SECRET es obligatorio (validado en validateEnv)
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    
    // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // ✅ Persistir refresh token en BD (hash SHA-256)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Calcular expiresAt desde refreshExpiresIn (ej: '7d' = 7 días)
    const expiresInMs = this.parseExpiresIn(refreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await this.prisma.refreshtoken.create({
      data: {
        userId,
        tenantId: tenantId || null,
        tokenHash,
        expiresAt,
      },
    });

    this.logger.log(`Refresh token persistido para usuario ${userId}, tenant ${tenantId || 'N/A'}`);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Parsea expiresIn string (ej: '7d', '15m') a milisegundos
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default a 7 días si no se puede parsear
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 86400000);
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
        // Obtener tenantId del usuario existente (necesario para context binding)
        const activeMembership = user.tenantmembership.find(
          (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
        ) || user.tenantmembership[0];
        tenantId = activeMembership?.tenantId;

        // Crear identity primero para obtener el ID (necesario para recordId en context binding)
        // Usaremos un ID temporal y luego actualizaremos
        const tempIdentityId = `temp-${Date.now()}`;
        
        // Encriptar tokens OAuth antes de guardar (usando CryptoService)
        const encryptedAccessToken = profile.accessToken 
          ? this.cryptoService.encryptJson(
              { token: profile.accessToken },
              { tenantId: tenantId || 'system', recordId: tempIdentityId }
            ) as any
          : null;
        const encryptedRefreshToken = profile.refreshToken 
          ? this.cryptoService.encryptJson(
              { token: profile.refreshToken },
              { tenantId: tenantId || 'system', recordId: tempIdentityId }
            ) as any
          : null;
        
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

        // Re-cifrar con el recordId real (para context binding correcto)
        if (identity.id !== tempIdentityId && tenantId) {
          if (profile.accessToken) {
            const finalEncryptedAccessToken = this.cryptoService.encryptJson(
              { token: profile.accessToken },
              { tenantId, recordId: identity.id }
            );
            await this.prisma.useridentity.update({
              where: { id: identity.id },
              data: { accessToken: finalEncryptedAccessToken as any },
            });
          }
          if (profile.refreshToken) {
            const finalEncryptedRefreshToken = this.cryptoService.encryptJson(
              { token: profile.refreshToken },
              { tenantId, recordId: identity.id }
            );
            await this.prisma.useridentity.update({
              where: { id: identity.id },
              data: { refreshToken: finalEncryptedRefreshToken as any },
            });
          }
        }

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

          // Crear identity primero para obtener el ID (necesario para recordId en context binding)
          const tempIdentityId = `temp-${Date.now()}`;
          
          // Encriptar tokens OAuth antes de guardar (usando CryptoService)
          const encryptedAccessToken = profile.accessToken 
            ? this.cryptoService.encryptJson(
                { token: profile.accessToken },
                { tenantId: tenant.id, recordId: tempIdentityId }
              ) as any
            : null;
          const encryptedRefreshToken = profile.refreshToken 
            ? this.cryptoService.encryptJson(
                { token: profile.refreshToken },
                { tenantId: tenant.id, recordId: tempIdentityId }
              ) as any
            : null;

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

          // Re-cifrar con el recordId real (para context binding correcto)
          if (newIdentity.id !== tempIdentityId) {
            if (profile.accessToken) {
              const finalEncryptedAccessToken = this.cryptoService.encryptJson(
                { token: profile.accessToken },
                { tenantId: tenant.id, recordId: newIdentity.id }
              );
              await tx.useridentity.update({
                where: { id: newIdentity.id },
                data: { accessToken: finalEncryptedAccessToken as any },
              });
            }
            if (profile.refreshToken) {
              const finalEncryptedRefreshToken = this.cryptoService.encryptJson(
                { token: profile.refreshToken },
                { tenantId: tenant.id, recordId: newIdentity.id }
              );
              await tx.useridentity.update({
                where: { id: newIdentity.id },
                data: { refreshToken: finalEncryptedRefreshToken as any },
              });
            }
          }

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
        // Obtener tenantId del usuario existente (necesario para context binding)
        const activeMembership = user.tenantmembership.find(
          (m) => m.tenant.status === $Enums.tenant_status.ACTIVE || m.tenant.status === $Enums.tenant_status.TRIAL,
        ) || user.tenantmembership[0];
        tenantId = activeMembership?.tenantId;

        // Crear identity primero para obtener el ID (necesario para recordId en context binding)
        const tempIdentityId = `temp-${Date.now()}`;
        
        // Encriptar tokens OAuth antes de guardar (usando CryptoService)
        const encryptedAccessToken = profile.accessToken 
          ? this.cryptoService.encryptJson(
              { token: profile.accessToken },
              { tenantId: tenantId || 'system', recordId: tempIdentityId }
            ) as any
          : null;
        const encryptedRefreshToken = profile.refreshToken 
          ? this.cryptoService.encryptJson(
              { token: profile.refreshToken },
              { tenantId: tenantId || 'system', recordId: tempIdentityId }
            ) as any
          : null;
        
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

        // Re-cifrar con el recordId real (para context binding correcto)
        if (identity.id !== tempIdentityId && tenantId) {
          if (profile.accessToken) {
            const finalEncryptedAccessToken = this.cryptoService.encryptJson(
              { token: profile.accessToken },
              { tenantId, recordId: identity.id }
            );
            await this.prisma.useridentity.update({
              where: { id: identity.id },
              data: { accessToken: finalEncryptedAccessToken as any },
            });
          }
          if (profile.refreshToken) {
            const finalEncryptedRefreshToken = this.cryptoService.encryptJson(
              { token: profile.refreshToken },
              { tenantId, recordId: identity.id }
            );
            await this.prisma.useridentity.update({
              where: { id: identity.id },
              data: { refreshToken: finalEncryptedRefreshToken as any },
            });
          }
        }

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

          // Crear identity primero para obtener el ID (necesario para recordId en context binding)
          const tempIdentityId = `temp-${Date.now()}`;
          
          // Encriptar tokens OAuth antes de guardar (usando CryptoService)
          const encryptedAccessToken = profile.accessToken 
            ? this.cryptoService.encryptJson(
                { token: profile.accessToken },
                { tenantId: tenant.id, recordId: tempIdentityId }
              ) as any
            : null;
          const encryptedRefreshToken = profile.refreshToken 
            ? this.cryptoService.encryptJson(
                { token: profile.refreshToken },
                { tenantId: tenant.id, recordId: tempIdentityId }
              ) as any
            : null;
          
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

          // Re-cifrar con el recordId real (para context binding correcto)
          if (newIdentity.id !== tempIdentityId) {
            if (profile.accessToken) {
              const finalEncryptedAccessToken = this.cryptoService.encryptJson(
                { token: profile.accessToken },
                { tenantId: tenant.id, recordId: newIdentity.id }
              );
              await tx.useridentity.update({
                where: { id: newIdentity.id },
                data: { accessToken: finalEncryptedAccessToken as any },
              });
            }
            if (profile.refreshToken) {
              const finalEncryptedRefreshToken = this.cryptoService.encryptJson(
                { token: profile.refreshToken },
                { tenantId: tenant.id, recordId: newIdentity.id }
              );
              await tx.useridentity.update({
                where: { id: newIdentity.id },
                data: { refreshToken: finalEncryptedRefreshToken as any },
              });
            }
          }

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

