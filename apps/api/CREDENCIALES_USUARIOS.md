# Credenciales de Usuarios - AI Landing Boost

## Usuarios Creados

### 👤 Klever - Administrador
- **Email:** `klever@admin.com`
- **Contraseña:** `KleverAdmin2024!`
- **Nombre:** Klever Admin
- **Rol:** ADMIN
- **Tenant:** AI Landing Boost

### 👤 Klever - Cliente
- **Email:** `klever@cliente.com`
- **Contraseña:** `KleverCliente2024!`
- **Nombre:** Klever Cliente
- **Rol:** AGENT (Cliente/Usuario estándar)
- **Tenant:** AI Landing Boost

### 👤 Jorge - Administrador
- **Email:** `jorge@admin.com`
- **Contraseña:** `JorgeAdmin2024!`
- **Nombre:** Jorge Admin
- **Rol:** ADMIN
- **Tenant:** AI Landing Boost

### 👤 Jorge - Cliente
- **Email:** `jorge@cliente.com`
- **Contraseña:** `JorgeCliente2024!`
- **Nombre:** Jorge Cliente
- **Rol:** AGENT (Cliente/Usuario estándar)
- **Tenant:** AI Landing Boost

### 👤 Owner (Super Administrador)
- **Email:** `owner@admin.com`
- **Contraseña:** `Owner2024!`
- **Nombre:** Owner Admin
- **Rol:** OWNER (Dueño del tenant)
- **Tenant:** AI Landing Boost

### 👤 Viewer (Solo Lectura)
- **Email:** `viewer@test.com`
- **Contraseña:** `Viewer2024!`
- **Nombre:** Usuario Viewer
- **Rol:** VIEWER (Solo lectura)
- **Tenant:** AI Landing Boost

---

## Roles Disponibles

- **OWNER:** Dueño del tenant, acceso completo
- **ADMIN:** Administrador, puede gestionar usuarios y configuraciones
- **AGENT:** Agente/Usuario estándar, acceso a funcionalidades principales
- **VIEWER:** Solo lectura, no puede realizar modificaciones

---

## Notas

- Todos los usuarios están asociados al tenant "AI Landing Boost" (slug: `ai-landing-boost`)
- Todos los usuarios tienen el email verificado (`emailVerified: true`)
- Las contraseñas son seguras y cumplen con los requisitos del sistema
- Para cambiar las contraseñas, los usuarios pueden usar la funcionalidad de recuperación de contraseña o un administrador puede actualizarlas desde la base de datos

---

## Cómo Ejecutar el Script de Nuevo

Si necesitas crear más usuarios o modificar los existentes, ejecuta:

```bash
cd apps/api
npm run create-users
```

O directamente:

```bash
cd apps/api
npx ts-node -r tsconfig-paths/register scripts/create-users.ts
```

