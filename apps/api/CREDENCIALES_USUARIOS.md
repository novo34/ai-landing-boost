# Credenciales de Usuarios - AI Landing Boost

⚠️ **IMPORTANTE DE SEGURIDAD:** Este archivo NO debe contener contraseñas reales. Las contraseñas deben gestionarse de forma segura.

## Usuarios de Prueba

Para desarrollo y pruebas, puedes crear usuarios usando el script de creación. Las contraseñas deben configurarse mediante variables de entorno o cambiarse después de la creación inicial.

### Configuración de Usuarios de Prueba

Los scripts de creación de usuarios aceptan variables de entorno para mayor seguridad:

```bash
# Ejemplo de uso seguro
TEST_EMAIL=test@example.com TEST_PASSWORD=your_secure_password npm run create-users
```

### Roles Disponibles

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

