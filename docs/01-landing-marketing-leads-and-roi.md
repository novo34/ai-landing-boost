# Landing: Marketing Leads y Calculadora ROI - Fase 1B

> **Fecha:** 2025-01-08  
> **Fase:** 1B - Landing completa con i18n, ROI y leads  
> **Referencia:** IA-Specs/02-internacionalizacion-y-ux.mdc, IA-Specs/05-frontend-standards.mdc, IA-Specs/06-backend-standards.mdc

---

## Resumen Ejecutivo

Se ha completado la implementación de la landing page a nivel "producto serio" con:

- ✅ Sistema i18n completo (es/en) con detección automática de idioma
- ✅ Calculadora de ROI funcional con lógica basada en horas, salario/hora y % de automatización
- ✅ Formulario de contacto/lead que envía datos al backend NestJS y persiste en DB
- ✅ SEO, OG tags y JSON-LD pulidos
- ✅ Todo listo para la siguiente fase (Auth, multitenancy, dashboard)

---

## Sistema de Internacionalización (i18n)

### Implementación

**Ubicación:** `apps/web/lib/i18n/`

**Archivos clave:**
- `index.ts` - Funciones para Server Components (`getTranslations`, `detectLocale`)
- `client.ts` - Hook `useTranslation` y `LocaleProvider` para Client Components
- `locales/es/landing.json` - Traducciones en español
- `locales/en/landing.json` - Traducciones en inglés

### Detección de Idioma

**Prioridad de detección:**
1. Query param `?lang=es|en`
2. Cookie `lang` (persistente)
3. Header `Accept-Language` (HTTP)
4. Fallback: Español (`es`)

**Implementación:**
- Server Components: Usa `detectLocale()` que lee cookies y headers
- Client Components: Usa `LocaleProvider` que detecta desde cookie, query param o `Accept-Language`

### Uso en Componentes

**Server Components:**
```typescript
import { getTranslations } from '@/lib/i18n';

export default async function Page() {
  const t = await getTranslations('landing');
  return <h1>{t('hero.title')}</h1>;
}
```

**Client Components:**
```typescript
'use client';
import { useTranslation } from '@/lib/i18n/client';

export function MyComponent() {
  const { t, locale, setLocale } = useTranslation('landing');
  return <button>{t('common.save')}</button>;
}
```

### Language Switcher

**Ubicación:** `apps/web/components/landing/Navigation.tsx`

**Características:**
- Toggle ES/EN en desktop (dropdown)
- Toggle ES/EN en mobile (dentro del menú móvil)
- Actualiza URL con `?lang=xx`
- Guarda preferencia en cookie
- No recarga la página (SPA)

---

## Calculadora de ROI

### Lógica de Cálculo

**Ubicación:** `apps/web/components/landing/ROICalculatorSection.tsx`

**Inputs:**
- `sector` (opcional) - Sector del negocio
- `numPeople` - Número de personas (1-20)
- `hoursPerWeek` - Horas por semana (5-40)
- `hourlyCost` - Coste por hora (15-100€)
- `automationRate` - Porcentaje de automatización (30-80%, default 55%)

**Cálculos:**
```typescript
const yearlyHours = numPeople * hoursPerWeek * 52;
const currentYearlyCost = yearlyHours * hourlyCost;
const estimatedSavings = currentYearlyCost * (automationRate / 100);

// Recomendación de inversión: payback en ~3-6 meses
const recommendedProjectBudgetMin = estimatedSavings * 0.25; // payback ~3-4 meses
const recommendedProjectBudgetMax = estimatedSavings * 0.5;  // payback ~6 meses

// Mantenimiento mensual: 10% del ahorro anual / 12
const recommendedMonthlyRetainer = (estimatedSavings * 0.1) / 12;
```

**Outputs:**
- Coste anual actual estimado
- Ahorro anual potencial
- Rango recomendado de inversión inicial (mín - máx)
- Mantenimiento mensual recomendado

**Formato de moneda:**
- Usa `Intl.NumberFormat` con el locale actual
- Español: EUR
- Inglés: EUR (puede cambiarse a USD si se requiere)

---

## Formulario de Leads

### Flujo Completo

```
Usuario → Landing → Calculadora ROI → Envío de Lead → NestJS → Prisma → MySQL
```

### Frontend

**Componente:** `apps/web/components/landing/ROICalculatorSection.tsx`

**Características:**
- Formulario aparece después de calcular ROI
- Campos: nombre*, email*, teléfono, empresa, mensaje
- Validación en cliente (email, campos requeridos)
- Estados: idle / loading / success / error
- Mensajes traducidos (es/en)
- Envía datos de ROI calculados junto con datos del lead

**API Client:**
- Usa `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:3001`)
- Endpoint: `POST /public/marketing/leads`

### Backend

**Módulo:** `apps/api/src/modules/marketing-leads/`

**Estructura:**
```
marketing-leads/
├── marketing-leads.module.ts
├── marketing-leads.controller.ts
├── marketing-leads.service.ts
└── dto/
    └── create-marketing-lead.dto.ts
```

**Endpoint:**
- `POST /public/marketing/leads`
- Público (sin auth) - TODO: rate limiting y protección anti-spam
- Valida con `class-validator`
- Crea `MarketingLead` y `RoiEstimate` asociado (si hay datos de ROI)

**Modelos Prisma:**

```prisma
model MarketingLead {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  name         String?
  email        String
  phone        String?
  company      String?
  message      String?
  locale       String   @default("es")
  source       String?  // 'landing', 'roi-calculator', etc.
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  roiEstimate  RoiEstimate?
}

model RoiEstimate {
  id                    String   @id @default(cuid())
  createdAt             DateTime @default(now())
  numPeople             Int
  hoursPerWeek          Float
  hourlyCost            Float
  automationRate        Float
  yearlyHours           Float
  currentYearlyCost     Float
  estimatedSavings      Float
  projectBudgetMin      Float
  projectBudgetMax      Float
  monthlyRetainer       Float
  leadId                String   @unique
  lead                  MarketingLead @relation(...)
}
```

**Nota:** Estos modelos NO tienen `tenant_id` porque son leads globales de marketing. El multi-tenant será para el SaaS interno.

---

## SEO, OG Tags y JSON-LD

### Metadatos

**Ubicación:** `apps/web/app/layout.tsx`

**Características:**
- Metadata completa con `metadataBase`
- Open Graph tags optimizados
- Twitter Cards
- `alternates` para es/en
- Keywords relevantes
- Robots configurados

### JSON-LD Schema

**Ubicación:** `apps/web/components/landing/SEOSchema.tsx`

**Schemas incluidos:**
- `Organization` - Información de AutomAI
- `Service` - Servicios ofrecidos
- `FAQPage` - Preguntas frecuentes
- `WebSite` - Información del sitio

**Adaptación por idioma:**
- El componente recibe `locale` como prop
- Se puede extender para mostrar contenido diferente por idioma

---

## Configuración

### Variables de Entorno

**Backend (`apps/api/.env`):**
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DB_NAME"
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Base de Datos

**Setup Prisma:**
```bash
cd apps/api
npx prisma generate
npx prisma migrate dev --name init_marketing_leads
```

**Nota:** Asegúrate de tener MySQL corriendo y la base de datos creada antes de ejecutar las migraciones.

---

## Cómo Probar

### 1. Levantar el Backend (NestJS)

```bash
cd apps/api
npm install  # Instalar dependencias (incluye Prisma)
npx prisma generate  # Generar Prisma Client
npx prisma migrate dev --name init_marketing_leads  # Ejecutar migraciones
npm run start:dev  # Iniciar en modo desarrollo (puerto 3001)
```

**Verificar:**
- API corriendo en `http://localhost:3001`
- Endpoint disponible: `POST http://localhost:3001/public/marketing/leads`

### 2. Levantar el Frontend (Next.js)

```bash
cd apps/web
npm install  # Instalar dependencias
npm run dev  # Iniciar en modo desarrollo (puerto 3000)
```

**Verificar:**
- Landing disponible en `http://localhost:3000`
- Language switcher funciona
- Traducciones cargan correctamente

### 3. Probar la Calculadora ROI

1. Navegar a `http://localhost:3000`
2. Scroll hasta la sección "Calculadora ROI"
3. Ajustar los valores:
   - Personas: 3
   - Horas/semana: 15
   - Coste/hora: 25€
   - Automatización: 55%
4. Click en "Calcular"
5. Verificar que aparecen los resultados
6. Completar el formulario de lead:
   - Nombre: Test
   - Email: test@example.com
   - (Opcional) Teléfono, empresa, mensaje
7. Click en "Enviar"
8. Verificar que aparece mensaje de éxito

### 4. Verificar en Base de Datos

```sql
-- Ver leads creados
SELECT * FROM MarketingLead ORDER BY createdAt DESC;

-- Ver estimaciones de ROI asociadas
SELECT * FROM RoiEstimate ORDER BY createdAt DESC;
```

### 5. Probar i18n

1. Click en el language switcher (ES/EN)
2. Verificar que todo el contenido cambia de idioma
3. Verificar que la URL se actualiza con `?lang=en` o `?lang=es`
4. Recargar la página y verificar que el idioma se mantiene (cookie)

---

## Archivos Clave Modificados

### Frontend (`apps/web`)

**Sistema i18n:**
- `lib/i18n/index.ts` - Funciones para Server Components
- `lib/i18n/client.ts` - Hook y Provider para Client Components
- `lib/i18n/locales/es/landing.json` - Traducciones español
- `lib/i18n/locales/en/landing.json` - Traducciones inglés

**Componentes adaptados:**
- `components/landing/Navigation.tsx` - Con language switcher
- `components/landing/HeroSection.tsx` - Traducido
- `components/landing/ProductSection.tsx` - Traducido
- `components/landing/HowItWorksSection.tsx` - Traducido
- `components/landing/BenefitsSection.tsx` - Traducido
- `components/landing/FAQSection.tsx` - Traducido
- `components/landing/Footer.tsx` - Traducido
- `components/landing/ROICalculatorSection.tsx` - Calculadora + formulario lead

**Layouts:**
- `app/layout.tsx` - Con LocaleProvider y metadata mejorada
- `app/(marketing)/page.tsx` - Con detección de locale

**Hooks:**
- `hooks/use-toast.ts` - Hook para notificaciones toast

### Backend (`apps/api`)

**Prisma:**
- `prisma/schema.prisma` - Modelos MarketingLead y RoiEstimate

**Módulo marketing-leads:**
- `src/modules/marketing-leads/marketing-leads.module.ts`
- `src/modules/marketing-leads/marketing-leads.controller.ts`
- `src/modules/marketing-leads/marketing-leads.service.ts`
- `src/modules/marketing-leads/dto/create-marketing-lead.dto.ts`

**Prisma Service:**
- `src/prisma/prisma.service.ts`
- `src/prisma/prisma.module.ts`

**Configuración:**
- `src/app.module.ts` - Importa PrismaModule y MarketingLeadsModule
- `src/main.ts` - CORS, ValidationPipe configurados

---

## Restricciones y TODOs

### Implementado

✅ Sistema i18n completo (es/en)  
✅ Calculadora ROI funcional  
✅ Formulario de leads conectado a backend  
✅ Persistencia en MySQL con Prisma  
✅ SEO y JSON-LD optimizados  

### Pendiente (Futuras Fases)

- [ ] Rate limiting en endpoint de leads
- [ ] Protección anti-spam (reCAPTCHA, honeypot)
- [ ] Validación de email (verificar dominio válido)
- [ ] Notificaciones por email cuando se crea un lead
- [ ] Dashboard para ver leads (requiere auth + multitenancy)
- [ ] Exportación de leads a CSV
- [ ] Integración con CRM (HubSpot, Salesforce, etc.)

---

## Notas Importantes

1. **Multi-tenant:** Los leads de marketing NO tienen `tenant_id` porque son leads globales. El multi-tenant será para el SaaS interno.

2. **Autenticación:** El endpoint `/public/marketing/leads` es público (sin auth). En producción, se debe añadir rate limiting y protección anti-spam.

3. **Base de datos:** Asegúrate de tener MySQL corriendo y la base de datos creada antes de ejecutar migraciones.

4. **Variables de entorno:** Crea `.env` en `apps/api` y `.env.local` en `apps/web` basándote en `.env.example`.

5. **Prisma Client:** Después de cambiar el schema, ejecuta `npx prisma generate` para regenerar el cliente.

---

**Última actualización:** 2025-01-08

