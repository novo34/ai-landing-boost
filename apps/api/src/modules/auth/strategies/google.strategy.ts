import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
      // Passport-google-oauth20 maneja state automáticamente para prevenir CSRF
      // Si necesitamos state personalizado, se puede agregar aquí
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user: GoogleProfile = {
      id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`.trim(),
      picture: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };
    
    done(null, user);
  }
}

