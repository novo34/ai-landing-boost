# AI-SPEC-50: Gestión Completa de Instancias Evolution API

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-50  
> **Prioridad:** 🟠 ALTA

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
│       │   └── evolution.provider.ts          [MODIFICAR - agregar métodos]
│       ├── dto/
│       │   ├── create-instance.dto.ts         [CREAR]
│       │   └── sync-instances.dto.ts          [CREAR]
│       └── schedulers/
│           └── whatsapp-sync.scheduler.ts     [CREAR]
```

---

## Archivos a Crear/Modificar

### 1. Modificar EvolutionProvider

**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

**Agregar métodos:**

```typescript
/**
 * Crea una nueva instancia en Evolution API
 */
async createInstance(options: {
  instanceName?: string;
  phoneNumber?: string;
}): Promise<{
  instanceName: string;
  instanceId: string;
  status: 'open' | 'close' | 'connecting';
  qrCodeUrl: string | null;
}> {
  try {
    const { instanceName, phoneNumber } = options;
    
    // Generar nombre si no se proporciona
    const finalInstanceName = instanceName || this.generateInstanceName();
    
    // Usar API Key maestra desde variables de entorno
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    // Crear instancia en Evolution API
    const response = await axios.post(
      `${normalizedUrl}/instance/create`,
      {
        instanceName: finalInstanceName,
        qrcode: true,
        integration: 'EVOLUTION',
        ...(phoneNumber && { number: phoneNumber }),
      },
      {
        headers: { apikey: masterApiKey },
        timeout: 15000,
      }
    );
    
    // Obtener QR code
    let qrCodeUrl: string | null = null;
    try {
      const qrResponse = await axios.get(
        `${normalizedUrl}/instance/connect/${finalInstanceName}`,
        {
          headers: { apikey: masterApiKey },
          timeout: 10000,
        }
      );
      
      // Manejar diferentes formatos de QR
      if (qrResponse.data?.qrcode?.base64) {
        qrCodeUrl = `data:image/png;base64,${qrResponse.data.qrcode.base64}`;
      } else if (qrResponse.data?.qrcode) {
        qrCodeUrl = qrResponse.data.qrcode;
      }
    } catch (qrError) {
      this.logger.warn(`Failed to get QR code for ${finalInstanceName}: ${qrError.message}`);
      // No fallar si no se puede obtener QR, continuar
    }
    
    return {
      instanceName: finalInstanceName,
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
 * Elimina una instancia de Evolution API
 */
async deleteInstance(instanceName: string): Promise<void> {
  try {
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    await axios.delete(`${normalizedUrl}/instance/delete/${instanceName}`, {
      headers: { apikey: masterApiKey },
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
async connectInstance(instanceName: string): Promise<{
  qrCodeUrl: string | null;
  status: 'open' | 'close' | 'connecting';
}> {
  try {
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    const response = await axios.get(
      `${normalizedUrl}/instance/connect/${instanceName}`,
      {
        headers: { apikey: masterApiKey },
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
async disconnectInstance(instanceName: string): Promise<void> {
  try {
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    await axios.delete(`${normalizedUrl}/instance/logout/${instanceName}`, {
      headers: { apikey: masterApiKey },
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
async getInstanceStatus(instanceName: string): Promise<{
  status: 'open' | 'close' | 'connecting';
  phoneNumber?: string;
  displayName?: string;
  lastSeen?: Date;
}> {
  try {
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    // Obtener estado de conexión
    const stateResponse = await axios.get(
      `${normalizedUrl}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: masterApiKey },
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
          headers: { apikey: masterApiKey },
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
    } catch (infoError) {
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
 * Lista todas las instancias en Evolution API
 */
async listAllInstances(): Promise<Array<{
  instanceName: string;
  status: 'open' | 'close' | 'connecting';
  phoneNumber?: string;
}>> {
  try {
    const masterApiKey = process.env.EVOLUTION_API_MASTER_KEY;
    const baseUrl = process.env.EVOLUTION_API_BASE_URL || this.defaultBaseUrl;
    
    if (!masterApiKey) {
      throw new Error('EVOLUTION_API_MASTER_KEY not configured');
    }
    
    const normalizedUrl = baseUrl.trim().replace(/\/$/, '');
    
    const response = await axios.get(`${normalizedUrl}/instance/fetchInstances`, {
      headers: { apikey: masterApiKey },
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
 * Genera un nombre único para instancia
 */
private generateInstanceName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  // Usar tenantId si está disponible en el contexto
  // Por ahora, usar solo timestamp y random
  return `tenant-${timestamp}-${random}`;
}
```

---

### 2. Crear DTOs

**Archivo:** `apps/api/src/modules/whatsapp/dto/create-instance.dto.ts`

```typescript
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateInstanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9-_]+$/, {
    message: 'Instance name can only contain alphanumeric characters, hyphens, and underscores',
  })
  instanceName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (e.g., +34612345678)',
  })
  phoneNumber?: string;
}
```

**Archivo:** `apps/api/src/modules/whatsapp/dto/sync-instances.dto.ts`

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

### 3. Modificar WhatsAppService

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Agregar métodos:**

```typescript
/**
 * Crea una nueva instancia de Evolution API automáticamente
 */
async createInstance(tenantId: string, dto: CreateInstanceDto) {
  // Verificar límite de instancias
  const existingAccounts = await this.prisma.tenantwhatsappaccount.count({
    where: { tenantId },
  });
  
  const maxInstances = parseInt(process.env.EVOLUTION_API_MAX_INSTANCES_PER_TENANT || '10', 10);
  if (existingAccounts >= maxInstances) {
    throw new BadRequestException({
      success: false,
      error_key: 'whatsapp.max_instances_reached',
      error_params: { max: maxInstances },
    });
  }
  
  // Crear instancia en Evolution API
  const instanceInfo = await this.evolutionProvider.createInstance({
    instanceName: dto.instanceName,
    phoneNumber: dto.phoneNumber,
  });
  
  // Encriptar credenciales (API Key maestra + instanceName)
  const credentials = {
    apiKey: process.env.EVOLUTION_API_MASTER_KEY,
    instanceName: instanceInfo.instanceName,
    baseUrl: process.env.EVOLUTION_API_BASE_URL,
  };
  
  const encryptedCredentials = EncryptionUtil.encrypt(JSON.stringify(credentials));
  
  // Determinar estado inicial
  const status = instanceInfo.status === 'open' 
    ? $Enums.tenantwhatsappaccount_status.CONNECTED 
    : $Enums.tenantwhatsappaccount_status.PENDING;
  
  // Crear registro en BD
  const account = await this.prisma.tenantwhatsappaccount.create({
    data: createData({
      tenantId,
      provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
      phoneNumber: dto.phoneNumber || '',
      status,
      credentials: encryptedCredentials,
      instanceName: instanceInfo.instanceName,
      qrCodeUrl: instanceInfo.qrCodeUrl,
      connectedAt: status === $Enums.tenantwhatsappaccount_status.CONNECTED ? new Date() : null,
      lastCheckedAt: new Date(),
    }),
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
  
  // Eliminar en Evolution API
  if (account.instanceName) {
    try {
      await this.evolutionProvider.deleteInstance(account.instanceName);
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
  
  // Desencriptar credenciales
  const credentials = JSON.parse(EncryptionUtil.decrypt(account.data.credentials));
  
  // Conectar instancia
  const connectResult = await this.evolutionProvider.connectInstance(credentials.instanceName);
  
  // Actualizar en BD
  await this.prisma.tenantwhatsappaccount.update({
    where: { id: accountId },
    data: {
      status: $Enums.tenantwhatsappaccount_status.PENDING,
      qrCodeUrl: connectResult.qrCodeUrl,
      lastCheckedAt: new Date(),
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
  
  // Desencriptar credenciales
  const credentials = JSON.parse(EncryptionUtil.decrypt(account.data.credentials));
  
  // Desconectar instancia
  await this.evolutionProvider.disconnectInstance(credentials.instanceName);
  
  // Actualizar en BD
  await this.prisma.tenantwhatsappaccount.update({
    where: { id: accountId },
    data: {
      status: $Enums.tenantwhatsappaccount_status.DISCONNECTED,
      lastCheckedAt: new Date(),
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
 * Sincroniza instancias con Evolution API
 */
async syncInstances(tenantId: string) {
  // Obtener todas las instancias del tenant
  const accounts = await this.prisma.tenantwhatsappaccount.findMany({
    where: {
      tenantId,
      provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
    },
  });
  
  // Obtener todas las instancias de Evolution API
  const evolutionInstances = await this.evolutionProvider.listAllInstances();
  
  let synced = 0;
  let updated = 0;
  let orphaned = 0;
  const errors: Array<{ instanceName: string; error: string }> = [];
  
  // Sincronizar cada cuenta
  for (const account of accounts) {
    try {
      const credentials = JSON.parse(EncryptionUtil.decrypt(account.credentials));
      const instanceName = credentials.instanceName;
      
      // Buscar instancia en Evolution API
      const evolutionInstance = evolutionInstances.find(
        (inst) => inst.instanceName === instanceName
      );
      
      if (!evolutionInstance) {
        // Instancia eliminada externamente
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: {
            status: $Enums.tenantwhatsappaccount_status.ERROR,
            lastCheckedAt: new Date(),
          },
        });
        orphaned++;
        continue;
      }
      
      // Actualizar estado según Evolution API
      const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);
      
      if (account.status !== newStatus) {
        await this.prisma.tenantwhatsappaccount.update({
          where: { id: account.id },
          data: {
            status: newStatus,
            phoneNumber: evolutionInstance.phoneNumber || account.phoneNumber,
            lastCheckedAt: new Date(),
            connectedAt: newStatus === $Enums.tenantwhatsappaccount_status.CONNECTED 
              ? (account.connectedAt || new Date())
              : account.connectedAt,
          },
        });
        updated++;
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
  evolutionStatus: 'open' | 'close' | 'connecting'
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

### 4. Modificar WhatsAppController

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts`

**Agregar endpoints:**

```typescript
/**
 * Crea una nueva instancia de Evolution API automáticamente
 */
@Post('accounts/create-instance')
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
@Delete('accounts/:id/delete-instance')
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
 * Sincroniza instancias con Evolution API
 */
@Get('accounts/sync')
@Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
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

### 5. Crear Servicio de Sincronización

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { $Enums } from '@prisma/client';

@Injectable()
export class WhatsAppSyncService {
  private readonly logger = new Logger(WhatsAppSyncService.name);

  constructor(
    private prisma: PrismaService,
    private evolutionProvider: EvolutionProvider,
  ) {}

  /**
   * Sincroniza todas las instancias de Evolution API
   */
  async syncAllTenants() {
    this.logger.debug('Starting sync of all Evolution API instances');
    
    // Obtener todos los tenants con cuentas Evolution API
    const accounts = await this.prisma.tenantwhatsappaccount.findMany({
      where: {
        provider: $Enums.tenantwhatsappaccount_provider.EVOLUTION_API,
      },
      select: {
        id: true,
        tenantId: true,
        instanceName: true,
        status: true,
        credentials: true,
      },
    });
    
    // Agrupar por tenant
    const accountsByTenant = new Map<string, typeof accounts>();
    for (const account of accounts) {
      if (!accountsByTenant.has(account.tenantId)) {
        accountsByTenant.set(account.tenantId, []);
      }
      accountsByTenant.get(account.tenantId)!.push(account);
    }
    
    // Sincronizar cada tenant
    for (const [tenantId, tenantAccounts] of accountsByTenant) {
      try {
        await this.syncTenantInstances(tenantId, tenantAccounts);
      } catch (error: any) {
        this.logger.error(`Failed to sync tenant ${tenantId}: ${error.message}`);
      }
    }
    
    this.logger.debug('Sync completed');
  }

  /**
   * Sincroniza instancias de un tenant específico
   */
  private async syncTenantInstances(tenantId: string, accounts: typeof accounts) {
    // Obtener todas las instancias de Evolution API
    const evolutionInstances = await this.evolutionProvider.listAllInstances();
    
    for (const account of accounts) {
      try {
        const credentials = JSON.parse(
          require('./utils/encryption.util').EncryptionUtil.decrypt(account.credentials)
        );
        const instanceName = credentials.instanceName;
        
        // Buscar instancia en Evolution API
        const evolutionInstance = evolutionInstances.find(
          (inst) => inst.instanceName === instanceName
        );
        
        if (!evolutionInstance) {
          // Instancia eliminada externamente
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: $Enums.tenantwhatsappaccount_status.ERROR,
              lastCheckedAt: new Date(),
            },
          });
          continue;
        }
        
        // Actualizar estado
        const newStatus = this.mapEvolutionStatusToAccountStatus(evolutionInstance.status);
        
        if (account.status !== newStatus) {
          await this.prisma.tenantwhatsappaccount.update({
            where: { id: account.id },
            data: {
              status: newStatus,
              lastCheckedAt: new Date(),
            },
          });
        }
      } catch (error: any) {
        this.logger.error(`Failed to sync account ${account.id}: ${error.message}`);
      }
    }
  }

  private mapEvolutionStatusToAccountStatus(
    evolutionStatus: 'open' | 'close' | 'connecting'
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

### 6. Crear Scheduler para Sincronización Automática

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
   * Sincroniza instancias cada 5 minutos
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

### 7. Modificar WhatsAppModule

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.module.ts`

**Agregar:**

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { WhatsAppSyncScheduler } from './schedulers/whatsapp-sync.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Para schedulers
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

### 8. Modificar Cliente API Frontend

**Archivo:** `apps/web/lib/api/client.ts`

**Agregar métodos:**

```typescript
/**
 * Crea una nueva instancia de Evolution API
 */
async createEvolutionInstance(data: {
  instanceName?: string;
  phoneNumber?: string;
}): Promise<ApiResponse<WhatsAppAccount>> {
  return this.post<WhatsAppAccount>('/whatsapp/accounts/create-instance', data);
}

/**
 * Elimina una instancia (BD + Evolution API)
 */
async deleteEvolutionInstance(id: string): Promise<ApiResponse<{ id: string; instanceName: string; deleted: boolean }>> {
  return this.delete<{ id: string; instanceName: string; deleted: boolean }>(`/whatsapp/accounts/${id}/delete-instance`);
}

/**
 * Conecta una instancia (obtiene nuevo QR)
 */
async connectEvolutionInstance(id: string): Promise<ApiResponse<{ id: string; qrCodeUrl: string | null; status: string }>> {
  return this.post<{ id: string; qrCodeUrl: string | null; status: string }>(`/whatsapp/accounts/${id}/connect`);
}

/**
 * Desconecta una instancia
 */
async disconnectEvolutionInstance(id: string): Promise<ApiResponse<{ id: string; status: string }>> {
  return this.post<{ id: string; status: string }>(`/whatsapp/accounts/${id}/disconnect`);
}

/**
 * Sincroniza instancias con Evolution API
 */
async syncEvolutionInstances(): Promise<ApiResponse<{ synced: number; updated: number; orphaned: number; errors: Array<{ instanceName: string; error: string }> }>> {
  return this.get<{ synced: number; updated: number; orphaned: number; errors: Array<{ instanceName: string; error: string }> }>('/whatsapp/accounts/sync');
}

/**
 * Obtiene estado detallado de una instancia
 */
async getEvolutionInstanceStatus(id: string): Promise<ApiResponse<WhatsAppAccount>> {
  return this.get<WhatsAppAccount>(`/whatsapp/accounts/${id}/status`);
}
```

---

## Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Evolution API - Instancia propia en Hostinger
EVOLUTION_API_BASE_URL=https://jn-evolution-api.xvvcvg.easypanel.host
EVOLUTION_API_MASTER_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_API_ENABLE_INSTANCE_CREATION=true

# Límites y configuración
EVOLUTION_API_MAX_INSTANCES_PER_TENANT=10
EVOLUTION_API_SYNC_INTERVAL_ACTIVE=300000  # 5 minutos
EVOLUTION_API_SYNC_INTERVAL_INACTIVE=1800000  # 30 minutos
```

---

## Dependencias NPM

**Backend:**

```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.0.0"  // Para schedulers
  }
}
```

---

## Testing

### Tests Unitarios

```typescript
describe('EvolutionProvider', () => {
  describe('createInstance', () => {
    it('should create instance with generated name', async () => {
      // Test
    });
    
    it('should create instance with provided name', async () => {
      // Test
    });
  });
  
  describe('deleteInstance', () => {
    it('should delete instance successfully', async () => {
      // Test
    });
  });
});
```

### Tests de Integración

```typescript
describe('WhatsAppController', () => {
  describe('POST /whatsapp/accounts/create-instance', () => {
    it('should create instance and return QR code', async () => {
      // Test
    });
  });
});
```

---

## Consideraciones de Implementación

1. **Manejo de Errores:** Todos los métodos deben manejar errores de Evolution API gracefully
2. **Timeouts:** Configurar timeouts apropiados (10-15 segundos)
3. **Retry Logic:** Implementar retry con backoff exponencial para requests fallidos
4. **Logging:** Loggear todas las operaciones importantes para debugging
5. **Validación:** Validar todos los inputs antes de llamar a Evolution API
6. **Sincronización:** Sincronización no debe bloquear requests del usuario

---

## Referencias

- PRD-50: Gestión Completa de Instancias Evolution API
- Evolution API Documentation: https://doc.evolution-api.com/
- Script de prueba: `apps/api/scripts/test-evolution-api.ts`

---

**Última actualización:** 2025-01-27
