# AI-SPEC-50: Gestión Completa de Instancias Evolution API

> **Versión:** 1.1  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-50 v1.1  
> **Prioridad:** 🟠 ALTA

---

## BREAKING CHANGES vs v1.0

| Cambio | v1.0 | v1.1 |
|--------|------|------|
| **EvolutionProvider** | Usa `EVOLUTION_API_MASTER_KEY` global | Recibe `baseUrl` + `apiKey` por tenant |
| **Cifrado** | `EncryptionUtil.encrypt/decrypt` | `CryptoService.encryptJson/decryptJson` (AES-256-GCM + AAD) |
| **Modelo BD** | Solo `TenantWhatsAppAccount` | Nueva tabla `TenantEvolutionConnection` |
| **Validación SSRF** | No existía | `validateEvolutionBaseUrl()` obligatorio |
| **Naming** | `tenant-{timestamp}-{random}` | `tenant-{tenantId}-{suffix}` (prefijo obligatorio) |
| **Sync** | Por instancia individual | Por tenant (1 fetchInstances → reconcile) |
| **Endpoints** | `/accounts/create-instance` | `/evolution/connect` + `/accounts` |

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   └── whatsapp/
│       ├── whatsapp.module.ts                 [MODIFICAR]
│       ├── whatsapp.service.ts                [MODIFICAR]
│       ├── whatsapp.controller.ts             [MODIFICAR]
│       ├── whatsapp-sync.service.ts           [CREAR]
│       ├── providers/
│       │   └── evolution.provider.ts          [REESCRIBIR - operar por tenant connection]
│       ├── dto/
│       │   ├── connect-evolution.dto.ts        [CREAR]
│       │   ├── create-instance.dto.ts         [MODIFICAR]
│       │   └── sync-instances.dto.ts          [CREAR]
│       └── schedulers/
│           └── whatsapp-sync.scheduler.ts     [CREAR]
├── modules/
│   └── crypto/
│       ├── crypto.service.ts                  [USAR - ya existe]
│       └── utils/
│           └── url-validation.util.ts          [USAR - ya existe]
└── prisma/
    └── schema.prisma                           [MODIFICAR - agregar TenantEvolutionConnection]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Agregar nueva tabla:**

```prisma
model TenantEvolutionConnection {
  id                String   @id @default(cuid())
  tenantId          String   @unique
  status            String   @default("DISCONNECTED") // CONNECTED, DISCONNECTED, PENDING, ERROR
  statusReason      String?  // TRANSIENT_ERROR, INVALID_CREDENTIALS, SSRF_BLOCKED, NETWORK_ERROR
  encryptedCredentials String // EncryptedBlobV1 JSON string con { baseUrl, apiKey }
  lastTestAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  tenant            tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accounts          tenantwhatsappaccount[]
  
  @@index([tenantId])
  @@index([status])
  @@map("TenantEvolutionConnection")
}
```

**Modificar `TenantWhatsAppAccount`:**

```prisma
model TenantWhatsAppAccount {
  // ... campos existentes ...
  
  // Nuevo campo: FK a TenantEvolutionConnection
  connectionId     String?
  connection       TenantEvolutionConnection? @relation(fields: [connectionId], references: [id], onDelete: SetNull)
  
  // Nuevo campo: statusReason para errores detallados
  statusReason     String?  // TRANSIENT_ERROR, INVALID_CREDENTIALS, EXTERNAL_DELETED, ORPHANED
  
  // Campo opcional para mejor tracking
  lastSyncedAt     DateTime? // Última sincronización con Evolution API
  
  // ... resto de campos ...
}
```

---

### 2. Reescribir EvolutionProvider

**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

**Cambio fundamental:** EvolutionProvider NO usa variables de entorno globales. Recibe `baseUrl` + `apiKey` como parámetros en cada método.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { validateEvolutionBaseUrl } from '@/modules/crypto/utils/url-validation.util';

@Injectable()
export class EvolutionProvider extends BaseWhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);

  /**
   * Crea una nueva instancia en Evolution API del tenant
   * @param baseUrl Base URL de Evolution API del tenant (validada con SSRF)
   * @param apiKey API Key del tenant
   * @param options Opciones de creación
   */
  async createInstance(
    baseUrl: string,
    apiKey: string,
    options: {
      instanceName: string; // DEBE incluir prefijo tenant-{tenantId}-
      phoneNumber?: string;
    },
  ): Promise<{
    instanceName: string;
    instanceId: string;
    status: 'open' | 'close' | 'connecting';
    qrCodeUrl: string | null;
  }> {
    try {
      // Validar baseUrl (SSRF protection - defensa en profundidad)
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const { instanceName, phoneNumber } = options;
      
      // Crear instancia en Evolution API
      const response = await axios.post(
        `${normalizedUrl}/instance/create`,
        {
          instanceName,
          qrcode: true,
          integration: 'EVOLUTION',
          ...(phoneNumber && { number: phoneNumber }),
        },
        {
          headers: { apikey: apiKey },
          timeout: 15000,
        }
      );
      
      // Obtener QR code
      let qrCodeUrl: string | null = null;
      try {
        const qrResponse = await axios.get(
          `${normalizedUrl}/instance/connect/${instanceName}`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );
        
        // Manejar diferentes formatos de QR
        if (qrResponse.data?.qrcode?.base64) {
          qrCodeUrl = `data:image/png;base64,${qrResponse.data.qrcode.base64}`;
        } else if (qrResponse.data?.qrcode) {
          qrCodeUrl = qrResponse.data.qrcode;
        }
      } catch (qrError: any) {
        this.logger.warn(`Failed to get QR code for ${instanceName}: ${qrError.message}`);
        // No fallar si no se puede obtener QR, continuar
      }
      
      return {
        instanceName,
        instanceId: response.data?.instance?.instanceId || response.data?.hash || '',
        status: response.data?.instance?.status || 'connecting',
        qrCodeUrl,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create instance: ${error.message}`);
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  /**
   * Elimina una instancia de Evolution API del tenant
   */
  async deleteInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<void> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      await axios.delete(`${normalizedUrl}/instance/delete/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      this.logger.debug(`Instance ${instanceName} deleted successfully`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Instancia ya no existe, considerar éxito
        this.logger.warn(`Instance ${instanceName} not found (may already be deleted)`);
        return;
      }
      this.logger.error(`Failed to delete instance ${instanceName}: ${error.message}`);
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
  }

  /**
   * Conecta una instancia (obtiene nuevo QR code)
   */
  async connectInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    qrCodeUrl: string | null;
    status: 'open' | 'close' | 'connecting';
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const response = await axios.get(
        `${normalizedUrl}/instance/connect/${instanceName}`,
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        }
      );
      
      let qrCodeUrl: string | null = null;
      if (response.data?.qrcode?.base64) {
        qrCodeUrl = `data:image/png;base64,${response.data.qrcode.base64}`;
      } else if (response.data?.qrcode) {
        qrCodeUrl = response.data.qrcode;
      }
      
      const status = response.data?.instance?.state || 'connecting';
      
      return {
        qrCodeUrl,
        status: status as 'open' | 'close' | 'connecting',
      };
    } catch (error: any) {
      this.logger.error(`Failed to connect instance ${instanceName}: ${error.message}`);
      throw new Error(`Failed to connect instance: ${error.message}`);
    }
  }

  /**
   * Desconecta una instancia
   */
  async disconnectInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<void> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      await axios.delete(`${normalizedUrl}/instance/logout/${instanceName}`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      this.logger.debug(`Instance ${instanceName} disconnected successfully`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.warn(`Instance ${instanceName} not found`);
        return;
      }
      this.logger.error(`Failed to disconnect instance ${instanceName}: ${error.message}`);
      throw new Error(`Failed to disconnect instance: ${error.message}`);
    }
  }

  /**
   * Obtiene estado detallado de una instancia
   */
  async getInstanceStatus(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    status: 'open' | 'close' | 'connecting';
    phoneNumber?: string;
    displayName?: string;
    lastSeen?: Date;
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      // Obtener estado de conexión
      const stateResponse = await axios.get(
        `${normalizedUrl}/instance/connectionState/${instanceName}`,
        {
          headers: { apikey: apiKey },
          timeout: 10000,
        }
      );
      
      const status = stateResponse.data?.instance?.state || stateResponse.data?.state || 'close';
      
      // Obtener información de la instancia
      let phoneNumber: string | undefined;
      let displayName: string | undefined;
      
      try {
        const instancesResponse = await axios.get(
          `${normalizedUrl}/instance/fetchInstances`,
          {
            headers: { apikey: apiKey },
            timeout: 10000,
          }
        );
        
        const instance = instancesResponse.data.find(
          (i: any) => i.name === instanceName || i.instance?.instanceName === instanceName
        );
        
        if (instance) {
          if (instance.ownerJid) {
            phoneNumber = instance.ownerJid.split('@')[0];
          } else if (instance.instance?.jid) {
            phoneNumber = instance.instance.jid.split('@')[0];
          }
          
          displayName = instance.name || instance.instance?.instanceName;
        }
      } catch (infoError: any) {
        this.logger.warn(`Failed to get instance info: ${infoError.message}`);
      }
      
      return {
        status: status as 'open' | 'close' | 'connecting',
        phoneNumber: phoneNumber ? `+${phoneNumber}` : undefined,
        displayName,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          status: 'close',
        };
      }
      this.logger.error(`Failed to get instance status ${instanceName}: ${error.message}`);
      throw new Error(`Failed to get instance status: ${error.message}`);
    }
  }

  /**
   * Lista todas las instancias en Evolution API del tenant
   * IMPORTANTE: Este método se llama UNA VEZ por tenant durante sync
   */
  async listAllInstances(
    baseUrl: string,
    apiKey: string,
  ): Promise<Array<{
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
    phoneNumber?: string;
  }>> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      const response = await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      if (!Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((inst: any) => {
        const instanceName = inst.name || inst.instance?.instanceName;
        const status = inst.connectionStatus || inst.instance?.state || 'close';
        let phoneNumber: string | undefined;
        
        if (inst.ownerJid) {
          phoneNumber = `+${inst.ownerJid.split('@')[0]}`;
        } else if (inst.instance?.jid) {
          phoneNumber = `+${inst.instance.jid.split('@')[0]}`;
        }
        
        return {
          instanceName,
          status: status as 'open' | 'close' | 'connecting',
          phoneNumber,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to list instances: ${error.message}`);
      throw new Error(`Failed to list instances: ${error.message}`);
    }
  }

  /**
   * Testa conexión a Evolution API del tenant
   */
  async testConnection(
    baseUrl: string,
    apiKey: string,
  ): Promise<{
    success: boolean;
    statusReason?: string;
  }> {
    try {
      const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
      
      // Intentar llamar a fetchInstances para validar credenciales
      await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        timeout: 10000,
      });
      
      return { success: true };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          statusReason: 'INVALID_CREDENTIALS',
        };
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          statusReason: 'NETWORK_ERROR',
        };
      }
      return {
        success: false,
        statusReason: 'TRANSIENT_ERROR',
      };
    }
  }
}
```

---

### 3. Crear DTOs

**Archivo:** `apps/api/src/modules/whatsapp/dto/connect-evolution.dto.ts`**

```typescript
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { validateEvolutionBaseUrl } from '@/modules/crypto/utils/url-validation.util';

export class ConnectEvolutionDto {
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsOptional()
  @IsBoolean()
  testConnection?: boolean; // Opcional: testar conexión ahora
}

// Validación custom para baseUrl (SSRF)
export function validateConnectEvolutionDto(dto: ConnectEvolutionDto): void {
  try {
    validateEvolutionBaseUrl(dto.baseUrl, false);
  } catch (error: any) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.invalid_base_url',
      message: error.message,
    });
  }
}
```

**Archivo:** `apps/api/src/modules/whatsapp/dto/create-instance.dto.ts`**

```typescript
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateInstanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^tenant-[a-zA-Z0-9]+-[a-zA-Z0-9-_]+$/, {
    message: 'Instance name must start with tenant-{tenantId}- prefix',
  })
  instanceName?: string; // Si no se proporciona, se genera con prefijo tenant-{tenantId}-

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +34612345678)',
  })
  phoneNumber?: string;
}
```

**Archivo:** `apps/api/src/modules/whatsapp/dto/sync-instances.dto.ts`**

```typescript
export class SyncInstancesResponseDto {
  synced: number;
  updated: number;
  orphaned: number;
  errors: Array<{
    instanceName: string;
    error: string;
  }>;
}
```

---

### 4. Modificar WhatsAppService

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Agregar métodos:**

```typescript
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EncryptedBlobV1 } from '@/modules/crypto/crypto.types';
import { validateEvolutionBaseUrl } from '@/modules/crypto/utils/url-validation.util';

// ... código existente ...

/**
 * Conecta Evolution API del tenant (guarda baseUrl + apiKey cifrados)
 */
async connectEvolution(
  tenantId: string,
  dto: ConnectEvolutionDto,
): Promise<{
  success: boolean;
  data: {
    id: string;
    tenantId: string;
    status: string;
    statusReason: string | null;
    lastTestAt: Date | null;
    createdAt: Date;
  };
}> {
  // Validar baseUrl (SSRF)
  validateConnectEvolutionDto(dto);

  // Testar conexión si se solicita
  let testResult: { success: boolean; statusReason?: string } | null = null;
  if (dto.testConnection) {
    testResult = await this.evolutionProvider.testConnection(dto.baseUrl, dto.apiKey);
  }

  // Cifrar credenciales con CryptoService
  const credentials = {
    baseUrl: dto.baseUrl,
    apiKey: dto.apiKey,
  };

  // Buscar conexión existente o crear nueva
  const existingConnection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });

  let connectionId: string;
  let encryptedBlob: EncryptedBlobV1;

  if (existingConnection) {
    // Actualizar conexión existente
    encryptedBlob = this.cryptoService.encryptJson(credentials, {
      tenantId,
      recordId: existingConnection.id,
    });

    const updated = await this.prisma.tenantevolutionconnection.update({
      where: { id: existingConnection.id },
      data: {
        status: testResult?.success ? 'CONNECTED' : testResult?.statusReason ? 'ERROR' : 'DISCONNECTED',
        statusReason: testResult?.statusReason || null,
        encryptedCredentials: JSON.stringify(encryptedBlob),
        lastTestAt: testResult ? new Date() : existingConnection.lastTestAt,
        updatedAt: new Date(),
      },
    });

    connectionId = updated.id;
  } else {
    // Crear nueva conexión (temporal ID para AAD)
    const tempId = `temp_${Date.now()}`;
    encryptedBlob = this.cryptoService.encryptJson(credentials, {
      tenantId,
      recordId: tempId,
    });

    const created = await this.prisma.tenantevolutionconnection.create({
      data: {
        tenantId,
        status: testResult?.success ? 'CONNECTED' : testResult?.statusReason ? 'ERROR' : 'DISCONNECTED',
        statusReason: testResult?.statusReason || null,
        encryptedCredentials: JSON.stringify(encryptedBlob),
        lastTestAt: testResult ? new Date() : null,
      },
    });

    // Re-cifrar con ID real para AAD correcto
    encryptedBlob = this.cryptoService.encryptJson(credentials, {
      tenantId,
      recordId: created.id,
    });

    const updated = await this.prisma.tenantevolutionconnection.update({
      where: { id: created.id },
      data: {
        encryptedCredentials: JSON.stringify(encryptedBlob),
      },
    });

    connectionId = updated.id;
  }

  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { id: connectionId },
  });

  return {
    success: true,
    data: {
      id: connection!.id,
      tenantId: connection!.tenantId,
      status: connection!.status,
      statusReason: connection!.statusReason,
      lastTestAt: connection!.lastTestAt,
      createdAt: connection!.createdAt,
    },
  };
}

/**
 * Testa conexión Evolution API del tenant
 */
async testEvolutionConnection(tenantId: string): Promise<{
  success: boolean;
  data: {
    status: string;
    statusReason: string | null;
    lastTestAt: Date;
  };
}> {
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    throw new NotFoundException({
      success: false,
      error_key: 'whatsapp.evolution_connection_not_found',
    });
  }

  // Descifrar credenciales
  const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
  const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
    encryptedBlob,
    {
      tenantId: connection.tenantId,
      recordId: connection.id,
    }
  );

  // Testar conexión
  const testResult = await this.evolutionProvider.testConnection(
    credentials.baseUrl,
    credentials.apiKey,
  );

  // Actualizar estado
  const updated = await this.prisma.tenantevolutionconnection.update({
    where: { id: connection.id },
    data: {
      status: testResult.success ? 'CONNECTED' : 'ERROR',
      statusReason: testResult.statusReason || null,
      lastTestAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      status: updated.status,
      statusReason: updated.statusReason,
      lastTestAt: updated.lastTestAt!,
    },
  };
}

/**
 * Obtiene estado de conexión Evolution del tenant
 */
async getEvolutionConnectionStatus(tenantId: string) {
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    return {
      success: true,
      data: {
        status: 'DISCONNECTED',
        statusReason: null,
        lastTestAt: null,
      },
    };
  }

  return {
    success: true,
    data: {
      status: connection.status,
      statusReason: connection.statusReason,
      lastTestAt: connection.lastTestAt,
    },
  };
}

/**
 * Genera nombre de instancia con prefijo obligatorio
 */
private generateInstanceName(tenantId: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const customSuffix = suffix || `${timestamp}-${random}`;
  return `tenant-${tenantId}-${customSuffix}`;
}

/**
 * Valida que instanceName pertenece al tenant
 */
private validateInstanceName(instanceName: string, tenantId: string): boolean {
  const prefix = `tenant-${tenantId}-`;
  return instanceName.startsWith(prefix) && instanceName.length <= 50;
}

/**
 * Crea una nueva instancia de Evolution API automáticamente
 */
async createInstance(tenantId: string, dto: CreateInstanceDto) {
  // Verificar que tenant tiene conexión Evolution
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });

  if (!connection || connection.status !== 'CONNECTED') {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.evolution_not_connected',
      message: 'Evolution API connection is required. Please connect your Evolution API first.',
    });
  }

  // Verificar límite de instancias
  const existingAccounts = await this.prisma.tenantwhatsappaccount.count({
    where: {
      tenantId,
      provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
    },
  });

  const maxInstances = parseInt(
    process.env.EVOLUTION_API_MAX_INSTANCES_PER_TENANT || '10',
    10,
  );
  if (existingAccounts >= maxInstances) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.max_instances_reached',
      error_params: { max: maxInstances },
    });
  }

  // Generar o validar instanceName
  let instanceName: string;
  if (dto.instanceName) {
    if (!this.validateInstanceName(dto.instanceName, tenantId)) {
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.invalid_instance_name',
        message: `Instance name must start with 'tenant-${tenantId}-' prefix`,
      });
    }
    instanceName = dto.instanceName;
  } else {
    instanceName = this.generateInstanceName(tenantId);
  }

  // Descifrar credenciales
  const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
  const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
    encryptedBlob,
    {
      tenantId: connection.tenantId,
      recordId: connection.id,
    }
  );

  // Crear instancia en Evolution API del tenant
  const instanceInfo = await this.evolutionProvider.createInstance(
    credentials.baseUrl,
    credentials.apiKey,
    {
      instanceName,
      phoneNumber: dto.phoneNumber,
    },
  );

  // Determinar estado inicial
  const status =
    instanceInfo.status === 'open'
      ? $Enums.tenantwhatsappaccount_status.CONNECTED
      : $Enums.tenantwhatsappaccount_status.PENDING;

  // Crear registro en BD
  const account = await this.prisma.tenantwhatsappaccount.create({
    data: {
      id: cuid(),
      tenantId,
      provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
      phoneNumber: dto.phoneNumber || '',
      status,
      credentials: '', // Ya no se guardan credenciales aquí, se usa connectionId
      instanceName: instanceInfo.instanceName,
      qrCodeUrl: instanceInfo.qrCodeUrl,
      connectionId: connection.id,
      connectedAt: status === $Enums.tenantwhatsappaccount_status.CONNECTED ? new Date() : null,
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      id: account.id,
      instanceName: account.instanceName,
      status: account.status,
      qrCodeUrl: account.qrCodeUrl,
      phoneNumber: account.phoneNumber,
      createdAt: account.createdAt,
    },
  };
}

/**
 * Elimina una instancia (BD + Evolution API)
 */
async deleteInstance(tenantId: string, accountId: string) {
  const account = await this.prisma.tenantwhatsappaccount.findFirst({
    where: {
      id: accountId,
      tenantId,
    },
    include: {
      connection: true,
    },
  });

  if (!account) {
    throw new NotFoundException({
      success: false,
      error_key: 'whatsapp.account_not_found',
    });
  }

  if (account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.only_evolution_supported',
    });
  }

  // Validar que instanceName pertenece al tenant
  if (account.instanceName && !this.validateInstanceName(account.instanceName, tenantId)) {
    throw new ForbiddenException({
      success: false,
      error_key: 'whatsapp.instance_not_owned',
    });
  }

  // Eliminar en Evolution API
  if (account.instanceName && account.connection) {
    try {
      const encryptedBlob: EncryptedBlobV1 = JSON.parse(account.connection.encryptedCredentials);
      const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
        encryptedBlob,
        {
          tenantId: account.connection.tenantId,
          recordId: account.connection.id,
        }
      );

      await this.evolutionProvider.deleteInstance(
        credentials.baseUrl,
        credentials.apiKey,
        account.instanceName,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to delete instance in Evolution API: ${error.message}`);
      // Continuar con eliminación en BD aunque falle en Evolution API
    }
  }

  // Eliminar en BD
  await this.prisma.tenantwhatsappaccount.delete({
    where: { id: accountId },
  });

  return {
    success: true,
    data: {
      id: accountId,
      instanceName: account.instanceName,
      deleted: true,
    },
  };
}

/**
 * Conecta una instancia (obtiene nuevo QR)
 */
async connectInstance(tenantId: string, accountId: string) {
  const account = await this.getAccountById(tenantId, accountId);

  if (account.data.provider !== 'EVOLUTION_API') {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.only_evolution_supported',
    });
  }

  if (!account.data.connectionId) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.evolution_connection_not_found',
    });
  }

  // Obtener conexión y descifrar credenciales
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { id: account.data.connectionId },
  });

  if (!connection) {
    throw new NotFoundException({
      success: false,
      error_key: 'whatsapp.evolution_connection_not_found',
    });
  }

  const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
  const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
    encryptedBlob,
    {
      tenantId: connection.tenantId,
      recordId: connection.id,
    }
  );

  // Validar instanceName
  if (!account.data.instanceName || !this.validateInstanceName(account.data.instanceName, tenantId)) {
    throw new ForbiddenException({
      success: false,
      error_key: 'whatsapp.instance_not_owned',
    });
  }

  // Conectar instancia
  const connectResult = await this.evolutionProvider.connectInstance(
    credentials.baseUrl,
    credentials.apiKey,
    account.data.instanceName,
  );

  // Actualizar en BD
  await this.prisma.tenantwhatsappaccount.update({
    where: { id: accountId },
    data: {
      status: $Enums.tenantwhatsappaccount_status.PENDING,
      qrCodeUrl: connectResult.qrCodeUrl,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      id: accountId,
      qrCodeUrl: connectResult.qrCodeUrl,
      status: 'PENDING',
    },
  };
}

/**
 * Desconecta una instancia
 */
async disconnectInstance(tenantId: string, accountId: string) {
  const account = await this.getAccountById(tenantId, accountId);

  if (account.data.provider !== 'EVOLUTION_API') {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.only_evolution_supported',
    });
  }

  if (!account.data.connectionId) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.evolution_connection_not_found',
    });
  }

  // Obtener conexión y descifrar credenciales
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { id: account.data.connectionId },
  });

  if (!connection) {
    throw new NotFoundException({
      success: false,
      error_key: 'whatsapp.evolution_connection_not_found',
    });
  }

  const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
  const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
    encryptedBlob,
    {
      tenantId: connection.tenantId,
      recordId: connection.id,
    }
  );

  // Validar instanceName
  if (!account.data.instanceName || !this.validateInstanceName(account.data.instanceName, tenantId)) {
    throw new ForbiddenException({
      success: false,
      error_key: 'whatsapp.instance_not_owned',
    });
  }

  // Desconectar instancia
  await this.evolutionProvider.disconnectInstance(
    credentials.baseUrl,
    credentials.apiKey,
    account.data.instanceName,
  );

  // Actualizar en BD
  await this.prisma.tenantwhatsappaccount.update({
    where: { id: accountId },
    data: {
      status: $Enums.tenantwhatsappaccount_status.DISCONNECTED,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      id: accountId,
      status: 'DISCONNECTED',
    },
  };
}

/**
 * Sincroniza instancias con Evolution API del tenant
 * IMPORTANTE: 1 fetchInstances por tenant → reconcile todas las instancias
 */
async syncInstances(tenantId: string) {
  // Obtener conexión Evolution del tenant
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });

  if (!connection || connection.status !== 'CONNECTED') {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.evolution_not_connected',
    });
  }

  // Descifrar credenciales
  const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
  const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
    encryptedBlob,
    {
      tenantId: connection.tenantId,
      recordId: connection.id,
    }
  );

  // Obtener todas las instancias del tenant en BD
  const accounts = await this.prisma.tenantwhatsappaccount.findMany({
    where: {
      tenantId,
      provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
      connectionId: connection.id,
    },
  });

  // Obtener todas las instancias de Evolution API del tenant (1 llamada)
  let evolutionInstances: Array<{
    instanceName: string;
    status: 'open' | 'close' | 'connecting';
    phoneNumber?: string;
  }>;
  try {
    evolutionInstances = await this.evolutionProvider.listAllInstances(
      credentials.baseUrl,
      credentials.apiKey,
    );
  } catch (error: any) {
    // Si falla, puede ser error de credenciales
    if (error.response?.status === 401 || error.response?.status === 403) {
      await this.prisma.tenantevolutionconnection.update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          statusReason: 'INVALID_CREDENTIALS',
          updatedAt: new Date(),
        },
      });
    }
    throw error;
  }

  // Indexar instancias de Evolution por nombre
  const evolutionIndex = new Map<string, typeof evolutionInstances[0]>();
  for (const inst of evolutionInstances) {
    evolutionIndex.set(inst.instanceName, inst);
  }

  let synced = 0;
  let updated = 0;
  let orphaned = 0;
  const errors: Array<{ instanceName: string; error: string }> = [];

  // Reconciliar: actualizar estados en BD según Evolution API
  for (const account of accounts) {
    try {
      if (!account.instanceName) {
        continue;
      }

      // Validar que instanceName pertenece al tenant
      if (!this.validateInstanceName(account.instanceName, tenantId)) {
        // Instancia no pertenece a este tenant, saltar
        continue;
      }

      // Buscar instancia en Evolution API
      const evolutionInstance = evolutionIndex.get(account.instanceName);

      if (!evolutionInstance) {
        // Instancia eliminada externamente
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
            statusReason: 'EXTERNAL_DELETED',
            lastCheckedAt: new Date(),
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        orphaned++;
        continue;
      }

      // Actualizar estado según Evolution API
      const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);

      if (account.status !== newStatus || account.phoneNumber !== evolutionInstance.phoneNumber) {
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: {
            status: newStatus,
            phoneNumber: evolutionInstance.phoneNumber || account.phoneNumber,
            statusReason: null, // Limpiar statusReason si se recupera
            lastCheckedAt: new Date(),
            lastSyncedAt: new Date(),
            connectedAt:
              newStatus === $Enums.tenantwhatsappaccount_status.CONNECTED
                ? account.connectedAt || new Date()
                : account.connectedAt,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Actualizar lastSyncedAt aunque no haya cambios
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: {
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      synced++;
    } catch (error: any) {
      errors.push({
        instanceName: account.instanceName || 'unknown',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    data: {
      synced,
      updated,
      orphaned,
      errors,
    },
  };
}

/**
 * Mapea estado de Evolution API a estado de cuenta
 */
private mapEvolutionStatusToAccountStatus(
  evolutionStatus: 'open' | 'close' | 'connecting',
): $Enums.tenantwhatsappaccount_status {
  switch (evolutionStatus) {
    case 'open':
      return $Enums.tenantwhatsappaccount_status.CONNECTED;
    case 'close':
      return $Enums.tenantwhatsappaccount_status.DISCONNECTED;
    case 'connecting':
      return $Enums.tenantwhatsappaccount_status.PENDING;
    default:
      return $Enums.tenantwhatsappaccount_status.ERROR;
  }
}
```

---

### 5. Modificar WhatsAppController

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts`

**Agregar endpoints:**

```typescript
/**
 * Conecta Evolution API del tenant
 */
@Post('evolution/connect')
@UseGuards(EmailVerifiedGuard)
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.CREATED)
async connectEvolution(
  @CurrentTenant() tenant: { id: string; role: string },
  @Body() dto: ConnectEvolutionDto,
) {
  return this.whatsappService.connectEvolution(tenant.id, dto);
}

/**
 * Testa conexión Evolution API del tenant
 */
@Post('evolution/test')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.OK)
async testEvolutionConnection(
  @CurrentTenant() tenant: { id: string; role: string },
) {
  return this.whatsappService.testEvolutionConnection(tenant.id);
}

/**
 * Obtiene estado de conexión Evolution del tenant
 */
@Get('evolution/status')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
async getEvolutionConnectionStatus(
  @CurrentTenant() tenant: { id: string; role: string },
) {
  return this.whatsappService.getEvolutionConnectionStatus(tenant.id);
}

/**
 * Crea una nueva instancia de Evolution API automáticamente
 */
@Post('accounts')
@UseGuards(EmailVerifiedGuard)
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.CREATED)
async createInstance(
  @CurrentTenant() tenant: { id: string; role: string },
  @Body() dto: CreateInstanceDto,
) {
  return this.whatsappService.createInstance(tenant.id, dto);
}

/**
 * Elimina una instancia (BD + Evolution API)
 */
@Delete('accounts/:id')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.OK)
async deleteInstance(
  @CurrentTenant() tenant: { id: string; role: string },
  @Param('id') id: string,
) {
  return this.whatsappService.deleteInstance(tenant.id, id);
}

/**
 * Conecta una instancia (obtiene nuevo QR)
 */
@Post('accounts/:id/connect')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.OK)
async connectInstance(
  @CurrentTenant() tenant: { id: string; role: string },
  @Param('id') id: string,
) {
  return this.whatsappService.connectInstance(tenant.id, id);
}

/**
 * Desconecta una instancia
 */
@Post('accounts/:id/disconnect')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.OK)
async disconnectInstance(
  @CurrentTenant() tenant: { id: string; role: string },
  @Param('id') id: string,
) {
  return this.whatsappService.disconnectInstance(tenant.id, id);
}

/**
 * Sincroniza instancias con Evolution API del tenant
 */
@Post('accounts/sync')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
@HttpCode(HttpStatus.OK)
async syncInstances(
  @CurrentTenant() tenant: { id: string; role: string },
) {
  return this.whatsappService.syncInstances(tenant.id);
}

/**
 * Obtiene estado detallado de una instancia
 */
@Get('accounts/:id/status')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
async getInstanceStatus(
  @CurrentTenant() tenant: { id: string; role: string },
  @Param('id') id: string,
) {
  return this.whatsappService.getInstanceStatus(tenant.id, id);
}
```

---

### 6. Crear Servicio de Sincronización

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { EncryptedBlobV1 } from '@/modules/crypto/crypto.types';
import { $Enums } from '@prisma/client';

@Injectable()
export class WhatsAppSyncService {
  private readonly logger = new Logger(WhatsAppSyncService.name);

  constructor(
    private prisma: PrismaService,
    private evolutionProvider: EvolutionProvider,
    private cryptoService: CryptoService,
  ) {}

  /**
   * Sincroniza todas las instancias de Evolution API (por tenant activo)
   */
  async syncAllTenants() {
    this.logger.debug('Starting sync of all Evolution API instances');

    // Obtener todas las conexiones Evolution activas
    const connections = await this.prisma.tenantevolutionconnection.findMany({
      where: {
        status: 'CONNECTED',
      },
    });

    // Sincronizar cada tenant
    for (const connection of connections) {
      try {
        await this.syncTenantInstances(connection.tenantId, connection.id);
      } catch (error: any) {
        this.logger.error(`Failed to sync tenant ${connection.tenantId}: ${error.message}`);
      }
    }

    this.logger.debug('Sync completed');
  }

  /**
   * Sincroniza instancias de un tenant específico
   * IMPORTANTE: 1 fetchInstances por tenant → reconcile todas las instancias
   */
  private async syncTenantInstances(tenantId: string, connectionId: string) {
    const connection = await this.prisma.tenantevolutionconnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'CONNECTED') {
      return;
    }

    // Descifrar credenciales
    const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
    const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
      encryptedBlob,
      {
        tenantId: connection.tenantId,
        recordId: connection.id,
      }
    );

    // Obtener todas las instancias del tenant en BD
    const accounts = await this.prisma.tenantwhatsappaccount.findMany({
      where: {
        tenantId,
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
        connectionId: connection.id,
      },
    });

    // Obtener todas las instancias de Evolution API del tenant (1 llamada)
    let evolutionInstances: Array<{
      instanceName: string;
      status: 'open' | 'close' | 'connecting';
      phoneNumber?: string;
    }>;
    try {
      evolutionInstances = await this.evolutionProvider.listAllInstances(
        credentials.baseUrl,
        credentials.apiKey,
      );
    } catch (error: any) {
      // Si falla, puede ser error de credenciales
      if (error.response?.status === 401 || error.response?.status === 403) {
        await this.prisma.tenantevolutionconnection.update({
          where: { id: connection.id },
          data: {
            status: 'ERROR',
            statusReason: 'INVALID_CREDENTIALS',
            updatedAt: new Date(),
          },
        });
      }
      this.logger.error(`Failed to fetch instances for tenant ${tenantId}: ${error.message}`);
      return;
    }

    // Indexar instancias de Evolution por nombre
    const evolutionIndex = new Map<string, typeof evolutionInstances[0]>();
    for (const inst of evolutionInstances) {
      evolutionIndex.set(inst.instanceName, inst);
    }

    // Reconciliar: actualizar estados en BD según Evolution API
    for (const account of accounts) {
      try {
        if (!account.instanceName) {
          continue;
        }

        // Validar que instanceName pertenece al tenant (prefijo)
        const prefix = `tenant-${tenantId}-`;
        if (!account.instanceName.startsWith(prefix)) {
          // Instancia no pertenece a este tenant, saltar
          continue;
        }

        // Buscar instancia en Evolution API
        const evolutionInstance = evolutionIndex.get(account.instanceName);

        if (!evolutionInstance) {
          // Instancia eliminada externamente
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: $Enums.tenantwhatsappaccount_status.ERROR,
              statusReason: 'EXTERNAL_DELETED',
              lastCheckedAt: new Date(),
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
          continue;
        }

        // Actualizar estado
        const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);

        if (account.status !== newStatus || account.phoneNumber !== evolutionInstance.phoneNumber) {
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: newStatus,
              phoneNumber: evolutionInstance.phoneNumber || account.phoneNumber,
              statusReason: null, // Limpiar statusReason si se recupera
              lastCheckedAt: new Date(),
              lastSyncedAt: new Date(),
              connectedAt:
                newStatus === $Enums.tenantwhatsappaccount_status.CONNECTED
                  ? account.connectedAt || new Date()
                  : account.connectedAt,
              updatedAt: new Date(),
            },
          });
        } else {
          // Actualizar lastSyncedAt aunque no haya cambios
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to sync account ${account.id}: ${error.message}`);
      }
    }
  }

  private mapEvolutionStatusToAccountStatus(
    evolutionStatus: 'open' | 'close' | 'connecting',
  ): $Enums.tenantwhatsappaccount_status {
    switch (evolutionStatus) {
      case 'open':
        return $Enums.tenantwhatsappaccount_status.CONNECTED;
      case 'close':
        return $Enums.tenantwhatsappaccount_status.DISCONNECTED;
      case 'connecting':
        return $Enums.tenantwhatsappaccount_status.PENDING;
      default:
        return $Enums.tenantwhatsappaccount_status.ERROR;
    }
  }
}
```

---

### 7. Crear Scheduler para Sincronización Automática

**Archivo:** `apps/api/src/modules/whatsapp/schedulers/whatsapp-sync.scheduler.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppSyncService } from '../whatsapp-sync.service';

@Injectable()
export class WhatsAppSyncScheduler {
  private readonly logger = new Logger(WhatsAppSyncScheduler.name);

  constructor(private syncService: WhatsAppSyncService) {}

  /**
   * Sincroniza instancias cada 5 minutos (activas)
   * Para instancias inactivas, se puede usar otro cron con intervalo mayor
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSync() {
    this.logger.debug('Running scheduled sync of Evolution API instances');
    try {
      await this.syncService.syncAllTenants();
    } catch (error: any) {
      this.logger.error(`Scheduled sync failed: ${error.message}`);
    }
  }
}
```

---

### 8. Modificar WhatsAppModule

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.module.ts`

**Agregar:**

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { CryptoModule } from '@/modules/crypto/crypto.module';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { WhatsAppSyncScheduler } from './schedulers/whatsapp-sync.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Para schedulers
    CryptoModule, // Para CryptoService
    // ... otros imports
  ],
  providers: [
    WhatsAppService,
    WhatsAppMessagingService,
    EvolutionProvider,
    WhatsAppCloudProvider,
    WhatsAppSyncService, // Nuevo
    WhatsAppSyncScheduler, // Nuevo
    // ... otros providers
  ],
  // ... resto del módulo
})
```

---

### 9. Modificar Cliente API Frontend

**Archivo:** `apps/web/lib/api/client.ts`

**Agregar métodos:**

```typescript
/**
 * Conecta Evolution API del tenant
 */
async connectEvolution(data: {
  baseUrl: string;
  apiKey: string;
  testConnection?: boolean;
}): Promise<ApiResponse<{
  id: string;
  tenantId: string;
  status: string;
  statusReason: string | null;
  lastTestAt: Date | null;
  createdAt: Date;
}>> {
  return this.post('/whatsapp/evolution/connect', data);
}

/**
 * Testa conexión Evolution API del tenant
 */
async testEvolutionConnection(): Promise<ApiResponse<{
  status: string;
  statusReason: string | null;
  lastTestAt: Date;
}>> {
  return this.post('/whatsapp/evolution/test');
}

/**
 * Obtiene estado de conexión Evolution del tenant
 */
async getEvolutionConnectionStatus(): Promise<ApiResponse<{
  status: string;
  statusReason: string | null;
  lastTestAt: Date | null;
}>> {
  return this.get('/whatsapp/evolution/status');
}

/**
 * Crea una nueva instancia de Evolution API
 */
async createEvolutionInstance(data: {
  instanceName?: string;
  phoneNumber?: string;
}): Promise<ApiResponse<WhatsAppAccount>> {
  return this.post<WhatsAppAccount>('/whatsapp/accounts', {
    provider: 'EVOLUTION_API',
    ...data,
  });
}

/**
 * Elimina una instancia (BD + Evolution API)
 */
async deleteEvolutionInstance(id: string): Promise<ApiResponse<{
  id: string;
  instanceName: string;
  deleted: boolean;
}>> {
  return this.delete(`/whatsapp/accounts/${id}`);
}

/**
 * Conecta una instancia (obtiene nuevo QR)
 */
async connectEvolutionInstance(id: string): Promise<ApiResponse<{
  id: string;
  qrCodeUrl: string | null;
  status: string;
}>> {
  return this.post(`/whatsapp/accounts/${id}/connect`);
}

/**
 * Desconecta una instancia
 */
async disconnectEvolutionInstance(id: string): Promise<ApiResponse<{
  id: string;
  status: string;
}>> {
  return this.post(`/whatsapp/accounts/${id}/disconnect`);
}

/**
 * Sincroniza instancias con Evolution API del tenant
 */
async syncEvolutionInstances(): Promise<ApiResponse<{
  synced: number;
  updated: number;
  orphaned: number;
  errors: Array<{ instanceName: string; error: string }>;
}>> {
  return this.post('/whatsapp/accounts/sync');
}

/**
 * Obtiene estado detallado de una instancia
 */
async getEvolutionInstanceStatus(id: string): Promise<ApiResponse<WhatsAppAccount>> {
  return this.get(`/whatsapp/accounts/${id}/status`);
}
```

---

## Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Límites y configuración
EVOLUTION_API_MAX_INSTANCES_PER_TENANT=10
EVOLUTION_API_ENABLE_INSTANCE_CREATION=true

# Sincronización
EVOLUTION_API_SYNC_INTERVAL_ACTIVE=300000  # 5 minutos (ms)
EVOLUTION_API_SYNC_INTERVAL_INACTIVE=1800000  # 30 minutos (ms)

# NOTA: NO existe EVOLUTION_API_MASTER_KEY ni EVOLUTION_API_BASE_URL global
# Cada tenant proporciona su propia baseUrl + apiKey
```

---

## Dependencias NPM

**Backend:**

```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.0.0"  // Para schedulers (ya debería estar)
  }
}
```

---

## Checklist de Implementación

### Fase 1: Modelo de Datos
- [ ] Crear migración Prisma para `TenantEvolutionConnection`
- [ ] Agregar `connectionId` y `statusReason` a `TenantWhatsAppAccount`
- [ ] Ejecutar migración
- [ ] Verificar índices y relaciones

### Fase 2: CryptoService y Validación SSRF
- [ ] Verificar que `CryptoService` está disponible
- [ ] Verificar que `validateEvolutionBaseUrl` está disponible
- [ ] Importar en `WhatsAppService` y `EvolutionProvider`

### Fase 3: EvolutionProvider
- [ ] Reescribir métodos para recibir `baseUrl` + `apiKey` como parámetros
- [ ] Agregar `validateEvolutionBaseUrl()` en cada método
- [ ] Agregar método `testConnection()`
- [ ] Eliminar referencias a `EVOLUTION_API_MASTER_KEY` global

### Fase 4: WhatsAppService
- [ ] Implementar `connectEvolution()`
- [ ] Implementar `testEvolutionConnection()`
- [ ] Implementar `getEvolutionConnectionStatus()`
- [ ] Modificar `createInstance()` para usar `TenantEvolutionConnection`
- [ ] Modificar `deleteInstance()`, `connectInstance()`, `disconnectInstance()` para usar conexión
- [ ] Implementar `syncInstances()` con estrategia eficiente (1 fetchInstances por tenant)
- [ ] Agregar validación de `instanceName` con prefijo `tenant-{tenantId}-`

### Fase 5: WhatsAppController
- [ ] Agregar endpoints `/evolution/connect`, `/evolution/test`, `/evolution/status`
- [ ] Modificar endpoint `/accounts` (POST) para crear instancias
- [ ] Agregar endpoints `/accounts/:id/connect`, `/accounts/:id/disconnect`
- [ ] Agregar endpoint `/accounts/sync` (POST)
- [ ] Agregar endpoint `/accounts/:id/status` (GET)

### Fase 6: WhatsAppSyncService y Scheduler
- [ ] Crear `WhatsAppSyncService` con sync eficiente por tenant
- [ ] Crear `WhatsAppSyncScheduler` con cron cada 5 minutos
- [ ] Registrar en `WhatsAppModule`

### Fase 7: DTOs
- [ ] Crear `ConnectEvolutionDto` con validación SSRF
- [ ] Modificar `CreateInstanceDto` con validación de prefijo
- [ ] Crear `SyncInstancesResponseDto`

### Fase 8: Frontend Client
- [ ] Agregar métodos en `apps/web/lib/api/client.ts`
- [ ] Actualizar rutas según nuevos endpoints

### Fase 9: Testing
- [ ] Tests unitarios para `EvolutionProvider` (con baseUrl + apiKey)
- [ ] Tests unitarios para `WhatsAppService` (con CryptoService)
- [ ] Tests de integración para endpoints
- [ ] Tests de validación SSRF
- [ ] Tests de validación de prefijo `tenant-{tenantId}-`

### Fase 10: Documentación
- [ ] Actualizar README con modelo BYOE
- [ ] Documentar variables de entorno
- [ ] Documentar flujos de conexión

---

## Consideraciones de Implementación

1. **Manejo de Errores:** Todos los métodos deben manejar errores de Evolution API gracefully
2. **Timeouts:** Configurar timeouts apropiados (10-15 segundos)
3. **Retry Logic:** Implementar retry con backoff exponencial para errores transitorios
4. **Logging:** Loggear todas las operaciones importantes para debugging (sin secretos)
5. **Validación:** Validar todos los inputs antes de llamar a Evolution API
6. **Sincronización:** Sincronización no debe bloquear requests del usuario
7. **SSRF:** Validar baseUrl en cada operación (defensa en profundidad)
8. **Cifrado:** Descifrar credenciales justo antes de usar, nunca cachear
9. **Multi-tenancy:** Validar `instanceName` con prefijo en cada operación
10. **Sync eficiente:** 1 `fetchInstances` por tenant, no por instancia

---

## Referencias

- PRD-50 v1.1: Gestión Completa de Instancias Evolution API
- PRD-51: Módulo Central de Cifrado (CryptoService)
- Evolution API Documentation: https://doc.evolution-api.com/
- AI-SPEC-51: Módulo Central de Cifrado

---

## Cambios Clave (v1.0 → v1.1)

| Aspecto | v1.0 | v1.1 |
|--------|------|------|
| **EvolutionProvider** | Usa `EVOLUTION_API_MASTER_KEY` global | Recibe `baseUrl` + `apiKey` por tenant |
| **Cifrado** | `EncryptionUtil.encrypt/decrypt` | `CryptoService.encryptJson/decryptJson` (AES-256-GCM + AAD) |
| **Modelo BD** | Solo `TenantWhatsAppAccount` | Nueva tabla `TenantEvolutionConnection` |
| **Validación SSRF** | No existía | `validateEvolutionBaseUrl()` obligatorio |
| **Naming** | `tenant-{timestamp}-{random}` | `tenant-{tenantId}-{suffix}` (prefijo obligatorio) |
| **Sync** | Por instancia individual | Por tenant (1 fetchInstances → reconcile) |
| **Endpoints** | `/accounts/create-instance` | `/evolution/connect` + `/accounts` |
| **Estados** | Básicos | + `statusReason` (TRANSIENT_ERROR, INVALID_CREDENTIALS, etc.) |
| **AAD** | No existía | `tenantId + connectionId` para cifrado |

---

**Última actualización:** 2025-01-27
