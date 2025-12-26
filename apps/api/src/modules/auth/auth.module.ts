import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';
import { CacheModule } from '../../common/cache/cache.module';

// Crear providers condicionales para OAuth
const oauthProviders = [];

// Solo registrar GoogleStrategy si está configurado
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthProviders.push(GoogleStrategy);
} else {
  console.log('⚠️ Google OAuth not configured. GoogleStrategy will be disabled.');
}

// Solo registrar MicrosoftStrategy si está configurado
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  oauthProviders.push(MicrosoftStrategy);
} else {
  console.log('⚠️ Microsoft OAuth not configured. MicrosoftStrategy will be disabled.');
}

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    EmailModule,
    N8nIntegrationModule,
    CacheModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: {
        // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenCleanupService, JwtStrategy, ...oauthProviders],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

