# Seguridad con ngrok - Guía de Configuración

## ⚠️ Advertencia Importante

Cuando usas ngrok para exponer tu aplicación de desarrollo, **estás exponiendo tu sistema públicamente en Internet**. Esto puede ser un riesgo de seguridad si no se configura correctamente.

## 🔒 Medidas de Seguridad Implementadas

### 1. Detección Automática de Entorno

El sistema detecta automáticamente:
- **Desarrollo local**: `localhost` o IPs locales
- **Desarrollo con ngrok**: URLs que contienen `ngrok`
- **Producción**: Cualquier otro dominio

### 2. Autenticación Básica (Recomendado)

Para proteger tu aplicación cuando uses ngrok, configura autenticación básica:

**En `apps/web/.env.local`:**

```env
# Autenticación básica para ngrok
NGROK_AUTH_USER=tu_usuario
NGROK_AUTH_PASS=tu_contraseña_segura
```

**Cómo funciona:**
- Cuando alguien accede a tu URL de ngrok, se le pedirá usuario y contraseña
- Solo las personas con las credenciales correctas podrán acceder
- Las credenciales se envían en cada petición

### 3. Lista Blanca de IPs (Opcional)

Puedes restringir el acceso solo a IPs específicas:

**En `apps/web/.env.local`:**

```env
# Lista de IPs permitidas (separadas por comas)
NGROK_ALLOWED_IPS=192.168.1.100,10.0.0.50

# O permitir todas las IPs (NO RECOMENDADO)
NGROK_ALLOWED_IPS=*
```

### 4. Validaciones Automáticas

El sistema valida automáticamente:
- ✅ Detección de entorno (desarrollo/producción)
- ✅ Validación de URLs de API
- ✅ Advertencias de seguridad cuando se usa ngrok sin protección

## 📋 Configuración Recomendada

### Para Desarrollo con ngrok (Seguro)

```env
# .env.local
BACKEND_INTERNAL_URL=http://127.0.0.1:3001
NEXT_PUBLIC_API_BASE=/api/proxy

# Seguridad para ngrok
NGROK_AUTH_USER=dev_user
NGROK_AUTH_PASS=contraseña_super_segura_123
NGROK_ALLOWED_IPS=192.168.1.100  # Tu IP pública (opcional)
```

### Para Producción

```env
# .env.production
NEXT_PUBLIC_API_BASE=/api/proxy
BACKEND_INTERNAL_URL=http://backend-interno:3001

# NO configurar NGROK_AUTH_* en producción
```

## 🛡️ Mejores Prácticas

### ✅ Hacer

1. **Siempre usar autenticación básica** cuando expongas ngrok públicamente
2. **Usar contraseñas fuertes** para la autenticación básica
3. **Limitar el tiempo** que ngrok está activo
4. **Revisar los logs** de ngrok regularmente
5. **Desactivar ngrok** cuando no lo necesites

### ❌ No Hacer

1. **NO exponer ngrok sin autenticación** en sistemas con datos sensibles
2. **NO usar ngrok en producción** (solo para desarrollo/testing)
3. **NO compartir URLs de ngrok** públicamente sin protección
4. **NO dejar ngrok activo** indefinidamente
5. **NO usar contraseñas débiles** para la autenticación básica

## 🔍 Verificación de Seguridad

El sistema muestra advertencias en la consola cuando:

- Se detecta uso de ngrok sin autenticación básica
- No hay lista de IPs permitidas configurada
- Se accede desde una IP no autorizada

**Ejemplo de advertencias:**

```
⚠️ Estás usando ngrok (túnel de desarrollo)
⚠️ El sistema está expuesto públicamente
⚠️ No hay autenticación básica configurada para ngrok
⚠️ Cualquiera con la URL puede acceder al sistema
```

## 🚨 Qué Hacer si Alguien Accede Sin Autorización

1. **Detén ngrok inmediatamente** (Ctrl+C)
2. **Cambia las credenciales** si las tenías configuradas
3. **Revisa los logs** de ngrok para ver qué accesos hubo
4. **Revisa los logs del backend** para detectar actividad sospechosa
5. **Considera rotar tokens/secrets** si crees que hubo compromiso

## 📝 Notas Adicionales

- El middleware de seguridad se aplica automáticamente cuando se detecta ngrok
- Las validaciones de seguridad solo se aplican cuando se accede a través de ngrok
- El acceso local (localhost) no requiere autenticación adicional
- En producción, las validaciones de ngrok no se aplican

## 🔗 Recursos

- [Documentación de ngrok sobre seguridad](https://ngrok.com/docs/secure-tunnels/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Autenticación Básica HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
