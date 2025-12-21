# Guía de Setup - Entorno de Desarrollo

> **Fecha:** 2025-01-08  
> **Objetivo:** Configurar el entorno completo para desarrollo local

---

## Prerrequisitos

- Node.js 20+ LTS
- Docker y Docker Compose (para MySQL)
- pnpm (o npm como alternativa)

---

## Pasos de Configuración

### 1. Levantar Base de Datos MySQL

```bash
# Desde la raíz del proyecto
docker compose up -d

# Verificar que MySQL está corriendo
docker ps

# Ver logs si hay problemas
docker logs ai-landing-boost-db
```

**Verificar conexión:**
- MySQL debería estar accesible en `localhost:3306`
- Usuario: `app_user`
- Password: `app_password`
- Base de datos: `ai_agency`

### 2. Configurar Variables de Entorno

#### Backend (`apps/api/.env`)

Crea el archivo `apps/api/.env` con:

```env
DATABASE_URL="mysql://app_user:app_password@localhost:3306/ai_agency"
PORT=3001
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`apps/web/.env.local`)

Crea el archivo `apps/web/.env.local` con:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### 3. Instalar Dependencias

**Opción A: Usando pnpm (recomendado)**

```bash
# Desde la raíz del proyecto
pnpm install
```

**Opción B: Usando npm**

```bash
# Backend
cd apps/api
npm install

# Frontend
cd ../web
npm install
```

### 4. Configurar Prisma

```bash
cd apps/api

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones (crea las tablas)
npx prisma migrate dev --name init_marketing_leads
```

**Verificar:**
- Se crean las tablas `MarketingLead` y `RoiEstimate`
- No hay errores de conexión

### 5. Levantar Backend (NestJS)

```bash
cd apps/api
npm run start:dev
# o
pnpm start:dev
```

**Verificar:**
- API corriendo en `http://localhost:3001`
- Log muestra: "API is running on: http://[::1]:3001"

**Probar endpoint:**
```bash
curl -X POST http://localhost:3001/public/marketing/leads \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","locale":"es"}'
```

### 6. Levantar Frontend (Next.js)

En una nueva terminal:

```bash
cd apps/web
npm run dev
# o
pnpm dev
```

**Verificar:**
- App corriendo en `http://localhost:3000`
- La landing se carga correctamente

### 7. Prueba End-to-End

1. Abre `http://localhost:3000` en el navegador
2. Verifica que la landing se ve correctamente
3. Prueba el language switcher (ES/EN)
4. Ve a la sección "Calculadora ROI"
5. Rellena los campos:
   - Personas: 3
   - Horas/semana: 15
   - Coste/hora: 25
   - Automatización: 55%
6. Click en "Calcular"
7. Verifica que aparecen los resultados
8. Completa el formulario de lead:
   - Nombre: Test User
   - Email: test@example.com
9. Click en "Enviar"
10. Verifica mensaje de éxito

### 8. Verificar en Base de Datos

```bash
# Conectar a MySQL
docker exec -it ai-landing-boost-db mysql -u app_user -papp_password ai_agency

# Ver leads
SELECT * FROM MarketingLead ORDER BY createdAt DESC;

# Ver estimaciones ROI
SELECT * FROM RoiEstimate ORDER BY createdAt DESC;
```

---

## Solución de Problemas

### MySQL no arranca

```bash
# Ver logs
docker logs ai-landing-boost-db

# Reiniciar contenedor
docker compose restart db

# Si hay problemas de puerto, verificar que 3306 no esté en uso
netstat -an | findstr 3306
```

### Error de conexión Prisma

- Verifica que `DATABASE_URL` en `.env` es correcta
- Verifica que MySQL está corriendo: `docker ps`
- Verifica usuario y password coinciden con docker-compose.yml

### Backend no arranca

- Verifica que las dependencias están instaladas: `npm list`
- Verifica que Prisma Client está generado: `npx prisma generate`
- Revisa los logs de error en la consola

### Frontend no conecta con backend

- Verifica que `NEXT_PUBLIC_API_BASE_URL` en `.env.local` es correcta
- Verifica que el backend está corriendo en el puerto 3001
- Revisa la consola del navegador para errores CORS

---

## Comandos Útiles

```bash
# Detener MySQL
docker compose down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker compose down -v

# Ver estado de contenedores
docker ps -a

# Resetear Prisma (borra y recrea DB)
cd apps/api
npx prisma migrate reset

# Ver estructura de tablas
npx prisma studio
```

---

## Estado Esperado

Al completar todos los pasos:

✅ MySQL corriendo en Docker  
✅ Prisma configurado y migrado  
✅ Backend NestJS corriendo en puerto 3001  
✅ Frontend Next.js corriendo en puerto 3000  
✅ Calculadora ROI funcional  
✅ Formulario de leads guardando en DB  
✅ i18n funcionando (ES/EN)  

---

**Última actualización:** 2025-01-08

