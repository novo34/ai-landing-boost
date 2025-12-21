# Configuración del Panel de Plataforma

## Problema

Si al acceder a `/platform` te redirige a `/app`, significa que:
1. La migración de base de datos no se ha ejecutado, O
2. Tu usuario no tiene el rol `platformRole` asignado

## Solución

### Paso 1: Ejecutar la migración de Prisma

```bash
cd apps/api
npx prisma migrate deploy
```

O si estás en desarrollo:

```bash
cd apps/api
npx prisma migrate dev
```

### Paso 2: Asignar rol PLATFORM_OWNER a tu usuario

#### Opción A: Usando el script (Recomendado)

```bash
cd apps/api
npx ts-node scripts/setup-platform-owner.ts tu-email@ejemplo.com
```

#### Opción B: Directamente en MySQL

```sql
-- Ver usuarios disponibles
SELECT id, email, name, platformRole FROM user;

-- Asignar rol PLATFORM_OWNER a tu usuario
UPDATE user SET platformRole = 'PLATFORM_OWNER' WHERE email = 'tu-email@ejemplo.com';

-- Verificar que se asignó correctamente
SELECT id, email, name, platformRole FROM user WHERE email = 'tu-email@ejemplo.com';
```

### Paso 3: Verificar en la consola del navegador

1. Abre la consola del navegador (F12)
2. Intenta acceder a `/platform`
3. Deberías ver logs como:
   ```
   🔍 Respuesta de getCurrentUser: {...}
   👤 Usuario obtenido: { id: "...", email: "...", platformRole: "PLATFORM_OWNER" }
   ✅ Usuario tiene acceso al panel de plataforma
   ```

## Roles disponibles

- `PLATFORM_OWNER`: Acceso completo al panel de plataforma
- `PLATFORM_ADMIN`: Administrador con permisos amplios
- `PLATFORM_SUPPORT`: Soporte técnico con acceso limitado

## Verificación

Después de asignar el rol, deberías poder:
- ✅ Acceder a `/platform` sin redirección
- ✅ Ver el dashboard de plataforma
- ✅ Ver la lista de tenants
- ✅ Acceder a todas las secciones del panel

## Troubleshooting

### Si sigue redirigiendo a /app:

1. **Verifica que la migración se ejecutó:**
   ```sql
   SHOW COLUMNS FROM user LIKE 'platformRole';
   ```
   Debe mostrar la columna `platformRole`.

2. **Verifica que el usuario tiene el rol:**
   ```sql
   SELECT email, platformRole FROM user WHERE email = 'tu-email@ejemplo.com';
   ```
   Debe mostrar `PLATFORM_OWNER`, `PLATFORM_ADMIN` o `PLATFORM_SUPPORT`.

3. **Limpia la caché del navegador** y vuelve a intentar.

4. **Revisa la consola del navegador** para ver los logs de debug.
