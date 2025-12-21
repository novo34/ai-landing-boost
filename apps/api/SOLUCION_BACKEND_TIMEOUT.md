# Solución: Backend No Responde (Timeout)

## 🔍 Problema Detectado

El backend está escuchando en el puerto 3001 pero **no responde** a las peticiones (timeout).

## 🐛 Posibles Causas

### 1. Base de Datos No Conectada
El backend puede estar intentando conectarse a MySQL pero fallando silenciosamente.

**Verificar:**
```powershell
# Verificar que MySQL esté corriendo
Get-Service -Name MySQL* -ErrorAction SilentlyContinue
```

**Solución:**
- Iniciar MySQL si no está corriendo
- Verificar DATABASE_URL en `.env`

### 2. Prisma Client No Generado
Si Prisma Client no está generado, las queries fallan.

**Solución:**
```powershell
cd apps\api
npx prisma generate
```

### 3. Error Silencioso en el Código
El código puede estar lanzando una excepción que no se está manejando.

**Verificar logs del backend:**
- Revisar la consola donde corre `npm run start:dev`
- Buscar errores de conexión a BD
- Buscar errores de Prisma

### 4. Problema con la Transacción
Si hay un problema con la transacción de Prisma, puede quedarse colgado.

## ✅ Soluciones

### Solución 1: Reiniciar Backend Completamente

```powershell
# Detener todos los procesos Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Limpiar y reiniciar
cd apps\api
npm run start:dev
```

### Solución 2: Verificar Conexión a Base de Datos

```powershell
cd apps\api
npx prisma db pull
```

Si falla, hay un problema con la conexión a la BD.

### Solución 3: Verificar Variables de Entorno

Asegúrate de que `apps/api/.env` tenga:

```env
DATABASE_URL=mysql://root@localhost:3306/ai_agencia
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
```

### Solución 4: Agregar Logging al Backend

Agregar logs en `auth.service.ts` para ver dónde se queda:

```typescript
async login(dto: LoginDto) {
  console.log('🔐 Login iniciado para:', dto.email);
  
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email },
    // ...
  });
  
  console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
  // ...
}
```

## 📝 Próximos Pasos

1. **Revisar consola del backend** - Ver si hay errores
2. **Verificar MySQL** - Asegurar que esté corriendo
3. **Regenerar Prisma Client** - `npx prisma generate`
4. **Reiniciar backend** - Detener y volver a iniciar

## 🔧 Comando de Verificación Rápida

```powershell
# Verificar que todo esté bien
cd apps\api

# 1. Verificar Prisma
npx prisma generate

# 2. Verificar conexión a BD
npx prisma db pull

# 3. Reiniciar backend
npm run start:dev
```

