# Auditoría de i18n - Progreso

## Estado Actual

### ✅ Completado

1. **Duplicaciones eliminadas**
   - ✅ Eliminadas claves duplicadas en `es/common.json` (nivel raíz vs `common.common`)
   - ✅ Eliminadas duplicaciones en `en/common.json`
   - ✅ Corregido objeto `channels` duplicado en `es/common.json`

2. **Claves agregadas en `es/common.json`**
   - ✅ `calendar.*` - Todas las claves para el wizard de calendario
   - ✅ `whatsapp.*` - Todas las claves para el wizard de WhatsApp
   - ✅ `gdpr.*` - Todas las claves para GDPR/FADP
   - ✅ `appointments.*` - Todas las claves para gestión de citas
   - ✅ `channels.*` - Claves adicionales para canales (fusionadas)
   - ✅ `errors.*` - Claves adicionales de errores
   - ✅ `auth.or_continue_with` - Clave faltante para login
   - ✅ Claves básicas en nivel raíz: `submit`, `required`, `invalidEmail`, `name`, `email`, `phone`, `company`, `message`

3. **Claves agregadas en `es/landing.json`**
   - ✅ `nav.main_navigation`, `nav.home_aria`, `nav.change_language`, `nav.language`
   - ✅ `roi_calculator.*` - Claves para mensajes del calculador ROI

4. **Textos hardcodeados reemplazados**
   - ✅ `Navigation.tsx` - aria-labels y textos de navegación
   - ✅ `ROICalculatorSection.tsx` - Mensajes de error y éxito
   - ✅ `login/page.tsx` - Todos los fallbacks eliminados
   - ✅ `app-sidebar.tsx` - Fallback eliminado

5. **Fallbacks eliminados en wizards**
   - ✅ `calendar-connection-wizard.tsx` - Todos los fallbacks eliminados (24 instancias)
   - ✅ `whatsapp-connection-wizard.tsx` - Todos los fallbacks eliminados (24 instancias)

6. **Sincronización de idiomas**
   - ✅ `en/common.json` - Estructura completa sincronizada con `es/common.json`
   - ✅ Eliminadas duplicaciones en `en/common.json`
   - ✅ Agregadas todas las claves faltantes en inglés

### 🔄 En Progreso

1. **Eliminación de fallbacks `|| 'texto'`**
   - Pendiente en:
     - `gdpr/page.tsx` (50+ instancias)
     - `appointments/page.tsx` (100+ instancias)
     - `channels/page.tsx` (50+ instancias)
     - Otros componentes menores

### 📋 Pendiente

1. **Sincronizar otros idiomas** - Agregar las mismas claves en de, fr, it, pt, nl, pl
2. **Verificar claves huérfanas** - Buscar claves en JSON que no se usan
3. **Verificar compilación** - Asegurar que todo compila sin errores
4. **Textos hardcodeados en backend** - Revisar mensajes de error del API

## Progreso Estimado

- **Estructura y claves**: 100% ✅
- **Fallbacks eliminados**: ~60% (wizards completados, páginas pendientes)
- **Sincronización idiomas**: ~25% (es y en completados, 6 idiomas pendientes)

## Próximos Pasos

1. Continuar eliminando fallbacks en páginas (gdpr, appointments, channels)
2. Sincronizar estructura en otros idiomas (de, fr, it, pt, nl, pl)
3. Buscar y eliminar claves huérfanas
4. Verificar compilación final

## Notas

- Los fallbacks `|| 'texto'` deben eliminarse completamente una vez que todas las claves estén en los JSON
- Algunos textos como "Google" y "Microsoft" en botones de login pueden dejarse hardcodeados (nombres de marca)
- Los placeholders como "tu@email.com" pueden dejarse hardcodeados (no son texto visible al usuario final)
- La estructura de `es/common.json` es ahora la fuente de verdad para sincronizar otros idiomas

