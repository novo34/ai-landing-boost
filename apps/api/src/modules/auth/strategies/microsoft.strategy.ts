import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';

export interface MicrosoftProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor() {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      callbackURL: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/auth/microsoft/callback',
      tenant: process.env.MICROSOFT_TENANT_ID || 'common',
      scope: ['user.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const user: MicrosoftProfile = {
      id: profile.id,
      email: profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName,
      name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
      picture: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    };
    
    done(null, user);
  }
}

