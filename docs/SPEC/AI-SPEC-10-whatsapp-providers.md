# AI-SPEC-10: Módulo de Proveedores WhatsApp

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-10  
> **Prioridad:** 🟠 ALTA

---

## Arquitectura

### Módulos NestJS a Crear

```
apps/api/src/
├── modules/
│   └── whatsapp/
│       ├── whatsapp.module.ts                 [CREAR]
│       ├── whatsapp.service.ts                [CREAR]
│       ├── whatsapp.controller.ts             [CREAR]
│       ├── providers/
│       │   ├── base.provider.ts               [CREAR]
│       │   ├── evolution.provider.ts          [CREAR]
│       │   └── whatsapp-cloud.provider.ts     [CREAR]
│       ├── dto/
│       │   ├── create-account.dto.ts          [CREAR]
│       │   └── update-account.dto.ts         [CREAR]
│       └── utils/
│           └── encryption.util.ts            [CREAR]
└── prisma/
    └── schema.prisma                           [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

```prisma
enum WhatsAppProvider {
  EVOLUTION_API
  WHATSAPP_CLOUD
}

enum WhatsAppAccountStatus {
  PENDING
  CONNECTED
  DISCONNECTED
  ERROR
}

model TenantWhatsAppAccount {
  id          String              @id @default(cuid())
  tenantId    String
  provider    WhatsAppProvider
  phoneNumber String
  status      WhatsAppAccountStatus @default(PENDING)
  credentials String              // JSON encriptado
  instanceName String?
  displayName  String?
  qrCodeUrl    String?
  connectedAt  DateTime?
  lastCheckedAt DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, phoneNumber])
  @@index([tenantId])
  @@index([provider, status])
}
```

---

### 2. Crear Encryption Utility

**Archivo:** `apps/api/src/modules/whatsapp/utils/encryption.util.ts`

```typescript
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

export class EncryptionUtil {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static mask(text: string): string {
    if (text.length <= 4) return '****';
    return `****-****-****-${text.slice(-4)}`;
  }
}
```

---

### 3. Crear Base Provider

**Archivo:** `apps/api/src/modules/whatsapp/providers/base.provider.ts`

```typescript
export interface WhatsAppProviderInterface {
  validateCredentials(credentials: any): Promise<boolean>;
  getAccountInfo(credentials: any): Promise<AccountInfo>;
  sendMessage(credentials: any, to: string, message: string): Promise<void>;
  getQRCode(credentials: any): Promise<string | null>;
}

export interface AccountInfo {
  phoneNumber: string;
  displayName: string;
  status: 'connected' | 'disconnected';
}

export abstract class BaseWhatsAppProvider implements WhatsAppProviderInterface {
  abstract validateCredentials(credentials: any): Promise<boolean>;
  abstract getAccountInfo(credentials: any): Promise<AccountInfo>;
  abstract sendMessage(credentials: any, to: string, message: string): Promise<void>;
  abstract getQRCode(credentials: any): Promise<string | null>;
}
```

---

### 4. Crear Evolution Provider

**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BaseWhatsAppProvider, AccountInfo } from './base.provider';
import axios from 'axios';

@Injectable()
export class EvolutionProvider extends BaseWhatsAppProvider {
  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      const { apiKey, instanceName, baseUrl } = credentials;
      const response = await axios.get(`${baseUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 5000,
      });
      return response.data?.state === 'open';
    } catch {
      return false;
    }
  }

  async getAccountInfo(credentials: any): Promise<AccountInfo> {
    const { apiKey, instanceName, baseUrl } = credentials;
    const response = await axios.get(`${baseUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
    });
    
    const instance = response.data.find((i: any) => i.instance.instanceName === instanceName);
    
    return {
      phoneNumber: instance?.instance?.jid?.split('@')[0] || '',
      displayName: instance?.instance?.instanceName || instanceName,
      status: instance?.instance?.state === 'open' ? 'connected' : 'disconnected',
    };
  }

  async getQRCode(credentials: any): Promise<string | null> {
    const { apiKey, instanceName, baseUrl } = credentials;
    try {
      const response = await axios.get(`${baseUrl}/instance/connect/${instanceName}`, {
        headers: { apikey: apiKey },
      });
      return response.data?.qrcode?.base64 || null;
    } catch {
      return null;
    }
  }

  async sendMessage(credentials: any, to: string, message: string): Promise<void> {
    const { apiKey, instanceName, baseUrl } = credentials;
    await axios.post(
      `${baseUrl}/message/sendText/${instanceName}`,
      { number: to, text: message },
      { headers: { apikey: apiKey } }
    );
  }
}
```

---

### 5. Crear WhatsApp Cloud Provider

**Archivo:** `apps/api/src/modules/whatsapp/providers/whatsapp-cloud.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { BaseWhatsAppProvider, AccountInfo } from './base.provider';
import axios from 'axios';

@Injectable()
export class WhatsAppCloudProvider extends BaseWhatsAppProvider {
  private readonly API_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v21.0';
  private readonly BASE_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  async validateCredentials(credentials: any): Promise<boolean> {
    try {
      const { accessToken, phoneNumberId } = credentials;
      const response = await axios.get(`${this.BASE_URL}/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'id,display_phone_number' },
        timeout: 5000,
      });
      return !!response.data?.id;
    } catch {
      return false;
    }
  }

  async getAccountInfo(credentials: any): Promise<AccountInfo> {
    const { accessToken, phoneNumberId } = credentials;
    const response = await axios.get(`${this.BASE_URL}/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: 'id,display_phone_number,verified_name' },
    });

    return {
      phoneNumber: response.data?.display_phone_number || '',
      displayName: response.data?.verified_name || 'WhatsApp Business',
      status: 'connected',
    };
  }

  async getQRCode(credentials: any): Promise<string | null> {
    // WhatsApp Cloud no usa QR codes
    return null;
  }

  async sendMessage(credentials: any, to: string, message: string): Promise<void> {
    const { accessToken, phoneNumberId } = credentials;
    await axios.post(
      `${this.BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
```

---

### 6. Crear WhatsApp Service

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionUtil } from './utils/encryption.util';
import { EvolutionProvider } from './providers/evolution.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { WhatsAppProvider, WhatsAppAccountStatus } from '@prisma/client';

@Injectable()
export class WhatsAppService {
  constructor(
    private prisma: PrismaService,
    private evolutionProvider: EvolutionProvider,
    private whatsappCloudProvider: WhatsAppCloudProvider,
  ) {}

  async getAccounts(tenantId: string) {
    const accounts = await this.prisma.tenantWhatsAppAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: accounts.map(acc => ({
        ...acc,
        credentials: {
          masked: EncryptionUtil.mask(JSON.parse(EncryptionUtil.decrypt(acc.credentials)).apiKey || ''),
        },
      })),
    };
  }

  async createAccount(tenantId: string, provider: WhatsAppProvider, credentials: any) {
    // Validar credenciales
    const isValid = await this.validateCredentials(provider, credentials);
    if (!isValid) {
      throw new BadRequestException('Invalid credentials');
    }

    // Obtener info de la cuenta
    const accountInfo = await this.getAccountInfo(provider, credentials);

    // Encriptar credenciales
    const encryptedCredentials = EncryptionUtil.encrypt(JSON.stringify(credentials));

    // Crear cuenta
    const account = await this.prisma.tenantWhatsAppAccount.create({
      data: {
        tenantId,
        provider,
        phoneNumber: accountInfo.phoneNumber,
        status: 'CONNECTED',
        credentials: encryptedCredentials,
        displayName: accountInfo.displayName,
        connectedAt: new Date(),
      },
    });

    return {
      success: true,
      data: account,
    };
  }

  async validateAccount(accountId: string) {
    const account = await this.prisma.tenantWhatsAppAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const credentials = JSON.parse(EncryptionUtil.decrypt(account.credentials));
    const isValid = await this.validateCredentials(account.provider, credentials);

    if (isValid) {
      const accountInfo = await this.getAccountInfo(account.provider, credentials);
      
      await this.prisma.tenantWhatsAppAccount.update({
        where: { id: accountId },
        data: {
          status: 'CONNECTED',
          displayName: accountInfo.displayName,
          lastCheckedAt: new Date(),
        },
      });
    } else {
      await this.prisma.tenantWhatsAppAccount.update({
        where: { id: accountId },
        data: { status: 'ERROR' },
      });
    }

    return { success: true, data: { status: isValid ? 'CONNECTED' : 'ERROR' } };
  }

  private async validateCredentials(provider: WhatsAppProvider, credentials: any): Promise<boolean> {
    switch (provider) {
      case 'EVOLUTION_API':
        return this.evolutionProvider.validateCredentials(credentials);
      case 'WHATSAPP_CLOUD':
        return this.whatsappCloudProvider.validateCredentials(credentials);
      default:
        return false;
    }
  }

  private async getAccountInfo(provider: WhatsAppProvider, credentials: any) {
    switch (provider) {
      case 'EVOLUTION_API':
        return this.evolutionProvider.getAccountInfo(credentials);
      case 'WHATSAPP_CLOUD':
        return this.whatsappCloudProvider.getAccountInfo(credentials);
      default:
        throw new BadRequestException('Unsupported provider');
    }
  }
}
```

---

## Tablas Prisma

Ver sección 1.

---

## DTOs

**CreateAccountDto:**

```typescript
import { IsEnum, IsObject, ValidateNested } from 'class-validator';
import { WhatsAppProvider } from '@prisma/client';

export class CreateAccountDto {
  @IsEnum(WhatsAppProvider)
  provider: WhatsAppProvider;

  @IsObject()
  credentials: any; // Validar según provider
}
```

---

## Controllers

**WhatsAppController:**

```typescript
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

  @Get('accounts')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async getAccounts(@CurrentTenant() tenant: any) {
    return this.whatsappService.getAccounts(tenant.id);
  }

  @Post('accounts')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async createAccount(@CurrentTenant() tenant: any, @Body() dto: CreateAccountDto) {
    return this.whatsappService.createAccount(tenant.id, dto.provider, dto.credentials);
  }

  @Post('accounts/:id/validate')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  async validateAccount(@Param('id') id: string) {
    return this.whatsappService.validateAccount(id);
  }
}
```

---

## Checklist Final

- [ ] Prisma schema actualizado
- [ ] Migración creada
- [ ] EncryptionUtil implementado
- [ ] Base provider creado
- [ ] Evolution provider implementado
- [ ] WhatsApp Cloud provider implementado
- [ ] WhatsAppService implementado
- [ ] WhatsAppController implementado
- [ ] DTOs creados
- [ ] Tests escritos
- [ ] Frontend con wizard implementado

---

**Última actualización:** 2025-01-XX







