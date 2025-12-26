import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req, Get, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Calcular expiración del access token (15-30 minutos)
    const accessTokenExpiresIn = this.parseExpiration(process.env.JWT_EXPIRES_IN || '15m');
    const accessTokenExpires = new Date(Date.now() + accessTokenExpiresIn);
    
    // Calcular expiración del refresh token (7-30 días)
    const refreshTokenExpiresIn = this.parseExpiration(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
    const refreshTokenExpires = new Date(Date.now() + refreshTokenExpiresIn);

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    // Access token cookie
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      expires: accessTokenExpires,
    });

    // Refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      expires: refreshTokenExpires,
    });

    console.log('🍪 Cookies emitidas:', {
      access_token: {
        expires: accessTokenExpires.toISOString(),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      },
      refresh_token: {
        expires: refreshTokenExpires.toISOString(),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
      },
    });
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // Default: 15 minutos
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 1000);
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Post('register')
  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 registros por minuto
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: false }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return {
      success: result.success,
      data: result.data,
    };
  }

  @Post('login')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 intentos de login por minuto
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: false }) res: Response) {
    console.log('📥 Petición de login recibida:', { email: dto.email });
    try {
      const result = await this.authService.login(dto);
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      console.log('✅ Login completado exitosamente');
      res.status(HttpStatus.OK).json({
        success: result.success,
        data: result.data,
      });
    } catch (error) {
      console.error('❌ Error en controller de login:', error);
      if (error instanceof UnauthorizedException) {
        const errorResponse = error.getResponse() as { error_key?: string } | undefined;
        res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          error_key: errorResponse?.error_key || 'auth.invalid_credentials',
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          error_key: 'errors.server_error',
        });
      }
    }
  }

  @Post('refresh')
  @Public()
  @Throttle({ medium: { limit: 20, ttl: 600000 } }) // 20 refreshes por 10 minutos
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        error_key: 'auth.refresh_token_required',
      });
    }

    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return {
      success: result.success,
    };
  }

  @Post('logout')
  @Public() // Permitir logout incluso sin token válido (para limpiar cookies)
  @Throttle({ short: { limit: 20, ttl: 60000 } }) // 20 logouts por minuto (aumentado para evitar 429)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      
      // Intentar obtener userId del refresh token si está disponible
      let userId: string | undefined;
      if (refreshToken) {
        try {
          const payload = this.jwtService.decode(refreshToken) as { sub?: string } | null;
          userId = payload?.sub;
        } catch (error) {
          // Si no se puede decodificar, continuar sin userId (se revocarán todos los tokens si se proporciona)
        }
      }

      // Si hay userId, revocar tokens; si no, solo limpiar cookies
      const result = userId 
        ? await this.authService.logout(userId, refreshToken)
        : { success: true };

      this.clearAuthCookies(res);
      return result;
    } catch (error) {
      // Si hay error, igual limpiar cookies
      this.clearAuthCookies(res);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }
  }

  // SSO Google
  @Get('google')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 intentos SSO por minuto
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirige automáticamente
  }

  @Get('google/callback')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 callbacks por minuto
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request & { user?: { id: string; email: string; name: string; picture?: string; accessToken?: string; refreshToken?: string } }, @Res() res: Response) {
    try {
      if (!req.user) {
        console.error('[SSO Google] Callback failed: User not found in request');
        throw new Error('User not found in request');
      }
      console.log('[SSO Google] Callback received for user:', req.user.email);
      const result = await this.authService.loginWithGoogle({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken,
      });
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('[SSO Google] Redirecting to:', `${frontendUrl}/app`);
      res.redirect(`${frontendUrl}/app`);
    } catch (error) {
      console.error('[SSO Google] Callback error:', error instanceof Error ? error.message : 'Unknown error');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=sso_failed`);
    }
  }

  // SSO Microsoft
  @Get('microsoft')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 intentos SSO por minuto
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuth() {
    // Passport redirige automáticamente
  }

  @Get('microsoft/callback')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } }) // 10 callbacks por minuto
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuthCallback(@Req() req: Request & { user?: { id: string; email: string; name: string; picture?: string; accessToken?: string; refreshToken?: string } }, @Res() res: Response) {
    try {
      if (!req.user) {
        console.error('[SSO Microsoft] Callback failed: User not found in request');
        throw new Error('User not found in request');
      }
      console.log('[SSO Microsoft] Callback received for user:', req.user.email);
      const result = await this.authService.loginWithMicrosoft({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        accessToken: req.user.accessToken,
        refreshToken: req.user.refreshToken,
      });
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('[SSO Microsoft] Redirecting to:', `${frontendUrl}/app`);
      res.redirect(`${frontendUrl}/app`);
    } catch (error) {
      console.error('[SSO Microsoft] Callback error:', error instanceof Error ? error.message : 'Unknown error');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=sso_failed`);
    }
  }

  // Verificación de email
  @Post('verify-email')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 verificaciones por minuto
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 reenvíos por minuto
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser() user: { userId: string; email: string; name?: string }) {
    if (!user || !user.userId) {
      throw new BadRequestException({
        success: false,
        error_key: 'auth.invalid_user',
        message: 'Invalid user data from token',
      });
    }
    
    await this.authService.sendVerificationEmail(user.userId);
    return {
      success: true,
      message: 'Verification email sent',
    };
  }
}

