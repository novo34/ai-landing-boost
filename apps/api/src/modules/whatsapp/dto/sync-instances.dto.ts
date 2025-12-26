/**
 * DTO de respuesta para sincronización de instancias
 */
export class SyncInstancesResponseDto {
  synced: number;
  updated: number;
  orphaned: number;
  errors: Array<{
    instanceName: string;
    error: string;
  }>;
}
