# Instrucciones de Migración de Datos Legacy - CRYPTO-001

## Objetivo

Migrar todos los datos cifrados en formato legacy (string) al nuevo formato `EncryptedBlobV1` usando `CryptoService`.

## Tablas Afectadas

1. **`tenantwhatsappaccount`** - Campo `credentials`
   - Formato legacy: `"iv:authTag:encrypted"` (hex, EncryptionUtil)
   - Formato nuevo: `EncryptedBlobV1` (JSON)

2. **`useridentity`** - Campos `accessToken`, `refreshToken`
   - Formato legacy: `"iv:authTag:encrypted"` (hex, EncryptionUtil)
   - Formato nuevo: `EncryptedBlobV1` (JSON)

3. **`calendarintegration`** - Campo `credentials`
   - Formato legacy: `"iv:authTag:encrypted"` (hex, EncryptionUtil)
   - Formato nuevo: `EncryptedBlobV1` (JSON)

4. **`tenantsmtpsettings`** - Campo `password`
   - Formato legacy: `"iv:tag:ciphertext"` (base64, EmailCryptoService)
   - Formato nuevo: `EncryptedBlobV1` (JSON)

5. **`emailsmtpsettings`** - Campo `password`
   - Formato legacy: `"iv:tag:ciphertext"` (base64, EmailCryptoService)
   - Formato nuevo: `EncryptedBlobV1` (JSON)

## Variables de Entorno Requeridas

```bash
# Clave legacy (para decrypt datos antiguos)
ENCRYPTION_KEY=...

# Clave nueva (para encrypt datos migrados)
ENCRYPTION_KEY_V1=...  # o ENCRYPTION_KEY_V{N} según activeKeyVersion
ENCRYPTION_ACTIVE_KEY_VERSION=1
```

## Variables de Entorno Opcionales

```bash
# Modo dry-run (solo simula, no actualiza BD)
CRYPTO_MIGRATION_DRY_RUN=true

# Tamaño de lote para procesamiento (default: 100)
CRYPTO_MIGRATION_BATCH_SIZE=50
```

## Pasos de Ejecución

### 1. Preparación

1. **Backup de base de datos:**
   ```bash
   # MySQL
   mysqldump -u user -p database_name > backup_before_crypto_migration.sql
   ```

2. **Verificar variables de entorno:**
   ```bash
   # Asegúrate de que ENCRYPTION_KEY y ENCRYPTION_KEY_V1 están configuradas
   echo $ENCRYPTION_KEY
   echo $ENCRYPTION_KEY_V1
   echo $ENCRYPTION_ACTIVE_KEY_VERSION
   ```

### 2. Dry-Run (Recomendado)

**Ejecutar primero en modo dry-run para ver qué se migrará:**

```bash
cd apps/api
CRYPTO_MIGRATION_DRY_RUN=true npm run migrate-crypto-legacy
```

**Revisar la salida:**
- Total procesados
- Migrados
- Omitidos (ya en formato nuevo)
- Errores (si los hay)

### 3. Migración Real

**Una vez verificado el dry-run, ejecutar la migración real:**

```bash
cd apps/api
npm run migrate-crypto-legacy
```

**O con batch size personalizado:**

```bash
CRYPTO_MIGRATION_BATCH_SIZE=50 npm run migrate-crypto-legacy
```

### 4. Verificación

**Verificar que no quedan datos legacy:**

```sql
-- Verificar tenantwhatsappaccount
SELECT id, tenantId, 
       CASE 
         WHEN JSON_EXTRACT(credentials, '$.v') = 1 THEN 'NUEVO'
         ELSE 'LEGACY'
       END as formato
FROM tenantwhatsappaccount
WHERE credentials IS NOT NULL;

-- Verificar useridentity
SELECT id, userId, provider,
       CASE 
         WHEN JSON_EXTRACT(accessToken, '$.v') = 1 THEN 'NUEVO'
         WHEN accessToken IS NOT NULL THEN 'LEGACY'
         ELSE 'NULL'
       END as accessToken_formato,
       CASE 
         WHEN JSON_EXTRACT(refreshToken, '$.v') = 1 THEN 'NUEVO'
         WHEN refreshToken IS NOT NULL THEN 'LEGACY'
         ELSE 'NULL'
       END as refreshToken_formato
FROM useridentity
WHERE accessToken IS NOT NULL OR refreshToken IS NOT NULL;

-- Verificar calendarintegration
SELECT id, tenantId, provider,
       CASE 
         WHEN JSON_EXTRACT(credentials, '$.v') = 1 THEN 'NUEVO'
         ELSE 'LEGACY'
       END as formato
FROM calendarintegration
WHERE credentials IS NOT NULL;

-- Verificar tenantsmtpsettings
SELECT id, tenantId,
       CASE 
         WHEN JSON_EXTRACT(password, '$.v') = 1 THEN 'NUEVO'
         WHEN password IS NOT NULL THEN 'LEGACY'
         ELSE 'NULL'
       END as formato
FROM tenantsmtpsettings
WHERE password IS NOT NULL;

-- Verificar emailsmtpsettings
SELECT id,
       CASE 
         WHEN JSON_EXTRACT(password, '$.v') = 1 THEN 'NUEVO'
         WHEN password IS NOT NULL THEN 'LEGACY'
         ELSE 'NULL'
       END as formato
FROM emailsmtpsettings
WHERE password IS NOT NULL;
```

**Todos los registros deben mostrar "NUEVO" o "NULL".**

## Solución de Problemas

### Error: "ENCRYPTION_KEY environment variable is required"

**Solución:** Configurar `ENCRYPTION_KEY` con la clave legacy usada para cifrar los datos antiguos.

### Error: "ENCRYPTION_KEY_V1 environment variable is required"

**Solución:** Configurar `ENCRYPTION_KEY_V1` (o la versión activa según `ENCRYPTION_ACTIVE_KEY_VERSION`).

### Error: "Invalid encrypted text format"

**Causa:** El formato legacy no coincide con los esperados (EncryptionUtil o EmailCryptoService).

**Solución:** Revisar el formato del dato en BD. Puede ser que:
- El dato ya esté en formato nuevo (se omite automáticamente)
- El dato esté corrupto
- El dato use un formato legacy diferente no soportado

### Error: "Authentication failed: context mismatch"

**Causa:** El AAD (Additional Authenticated Data) no coincide.

**Solución:** Verificar que `tenantId` y `recordId` sean correctos. El script usa:
- `tenantId`: Del registro (o 'system'/'platform' si no aplica)
- `recordId`: ID del registro

## Post-Migración

Después de migrar exitosamente:

1. ✅ **Verificar que no quedan datos legacy** (usar queries SQL arriba)
2. ✅ **Eliminar código legacy** (EncryptionUtil, EmailCryptoService)
3. ✅ **Eliminar compatibilidad legacy** en servicios
4. ✅ **Ejecutar tests** para verificar que todo funciona

## Notas Importantes

- ⚠️ **El script NO elimina datos legacy automáticamente.** Solo los migra.
- ⚠️ **El script NO valida que los datos descifrados sean correctos.** Solo migra el formato.
- ⚠️ **Si hay errores, revisar los detalles** en la salida del script.
- ✅ **El script es idempotente:** Puede ejecutarse múltiples veces sin problemas (omite datos ya migrados).

---

**Fecha de creación:** 2024-12-XX
**Autor:** Sistema de Auditoría Automática

