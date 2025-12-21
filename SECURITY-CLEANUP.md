# Limpieza de Seguridad - Contraseñas Expuestas

## ✅ Cambios Realizados

Se han eliminado todas las contraseñas hardcodeadas del código fuente y se han reemplazado con variables de entorno. Los archivos modificados incluyen:

### Scripts Corregidos
- `apps/api/scripts/create-channel-and-agent.js` - Ahora usa `TEST_EMAIL` y `TEST_PASSWORD`
- `apps/api/scripts/create-channel-and-agent.ts` - Requiere variables de entorno
- `apps/api/scripts/test-endpoint.ts` - Usa variables de entorno
- `apps/api/scripts/test-login.ts` - Usa variables de entorno
- `apps/api/scripts/test-login-direct.js` - Usa variables de entorno
- `apps/api/scripts/reset-password.js` - Usa `RESET_EMAIL` y `RESET_PASSWORD`
- `apps/api/scripts/create-platform-owner.ts` - Usa `PLATFORM_OWNER_EMAIL` y `PLATFORM_OWNER_PASSWORD`
- `apps/api/scripts/create-platform-owner.js` - Usa variables de entorno
- `apps/api/scripts/create-users.ts` - Usa `CREATE_USERS_CONFIG` (JSON)

### Documentación Limpiada
- `apps/web/VERIFICAR_BACKEND.md` - Contraseñas reemplazadas con variables de entorno
- `apps/api/CREDENCIALES_USUARIOS.md` - Contraseñas eliminadas
- `apps/api/RESUMEN_SOLUCION.md` - Contraseñas eliminadas
- `apps/api/AUDITORIA_LOGIN.md` - Contraseñas reemplazadas
- `apps/web/DEBUG_LOGIN.md` - Contraseñas reemplazadas

### .gitignore Actualizado
- Agregados patrones para ignorar archivos con credenciales

## ⚠️ IMPORTANTE: Limpieza del Historial de Git

Las contraseñas que ya fueron commitadas al repositorio permanecen en el historial de Git. Para eliminarlas completamente, necesitas:

### Opción 1: Usar git-filter-repo (Recomendado)

```bash
# Instalar git-filter-repo
pip install git-filter-repo

# Eliminar contraseñas específicas del historial
git filter-repo --replace-text <(echo "KleverAdmin2024!==>REMOVED_PASSWORD")
git filter-repo --replace-text <(echo "PlatformOwner2024!==>REMOVED_PASSWORD")
git filter-repo --replace-text <(echo "JorgeAdmin2024!==>REMOVED_PASSWORD")
git filter-repo --replace-text <(echo "password123==>REMOVED_PASSWORD")
```

### Opción 2: Usar BFG Repo-Cleaner

```bash
# Descargar BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# Crear archivo passwords.txt con las contraseñas a eliminar
echo "KleverAdmin2024!" > passwords.txt
echo "PlatformOwner2024!" >> passwords.txt
echo "JorgeAdmin2024!" >> passwords.txt
echo "password123" >> passwords.txt

# Limpiar historial
java -jar bfg.jar --replace-text passwords.txt

# Limpiar referencias
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Opción 3: Rotar Contraseñas (Más Seguro)

Si las contraseñas expuestas son de producción o cuentas reales:

1. **Cambiar todas las contraseñas inmediatamente** en:
   - Base de datos
   - Servicios externos
   - Cuentas de correo
   - Cualquier servicio que use esas credenciales

2. **Notificar a los usuarios afectados** para que cambien sus contraseñas

3. **Revisar logs de acceso** para detectar accesos no autorizados

## 🔒 Mejores Prácticas Implementadas

1. ✅ **Variables de Entorno**: Todas las contraseñas ahora se obtienen de variables de entorno
2. ✅ **Validación**: Los scripts requieren que las variables estén configuradas
3. ✅ **Sin Hardcoding**: No hay contraseñas hardcodeadas en el código fuente
4. ✅ **Documentación Segura**: La documentación no contiene contraseñas reales
5. ✅ **.gitignore Mejorado**: Patrones para evitar que archivos con credenciales se suban

## 📝 Uso de Scripts Actualizado

### Ejemplo: Crear Canal y Agente
```bash
TEST_EMAIL=test@example.com TEST_PASSWORD=securepassword npm run script:create-channel-agent
```

### Ejemplo: Crear Platform Owner
```bash
PLATFORM_OWNER_EMAIL=owner@example.com PLATFORM_OWNER_PASSWORD=securepassword npm run script:create-platform-owner
```

### Ejemplo: Crear Usuarios
```bash
CREATE_USERS_CONFIG='[{"email":"test@example.com","password":"securepass","name":"Test User","role":"ADMIN"}]' npm run create-users
```

## 🚨 Acciones Inmediatas Requeridas

1. **Cambiar contraseñas expuestas** en todos los sistemas
2. **Revisar accesos no autorizados** en logs
3. **Notificar al equipo** sobre la exposición
4. **Considerar rotar todas las credenciales** relacionadas
5. **Limpiar el historial de Git** usando una de las opciones arriba

## 📚 Referencias

- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
