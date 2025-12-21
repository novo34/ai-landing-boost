# AI-SPEC-37: Páginas Legales

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-37  
> **Prioridad:** 🟡 MEDIA

---

## Arquitectura

### Archivos Frontend a Crear

```
apps/web/app/
├── legal/
│   ├── aviso-legal/
│   │   └── page.tsx                    [CREAR]
│   ├── privacidad/
│   │   └── page.tsx                    [CREAR]
│   ├── cookies/
│   │   └── page.tsx                    [CREAR]
│   └── terminos/
│       └── page.tsx                    [CREAR]
└── components/
    └── cookie-consent.tsx              [CREAR]
```

---

## Archivos a Crear/Modificar

### 1. Crear Página de Aviso Legal

**Archivo:** `apps/web/app/legal/aviso-legal/page.tsx`

```typescript
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Aviso Legal',
  description: 'Aviso legal de AI Landing Boost',
};

export default function AvisoLegalPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Aviso Legal</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa que:
          </p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li><strong>Denominación social:</strong> [Nombre de la empresa]</li>
            <li><strong>CIF/NIF:</strong> [CIF/NIF]</li>
            <li><strong>Domicilio social:</strong> [Dirección]</li>
            <li><strong>Email de contacto:</strong> [Email]</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Condiciones de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            El acceso y uso de este sitio web implica la aceptación de las presentes condiciones de uso.
          </p>
        </CardContent>
      </Card>

      {/* Más secciones... */}
    </div>
  );
}
```

---

### 2. Crear Página de Política de Privacidad

**Archivo:** `apps/web/app/legal/privacidad/page.tsx`

```typescript
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de AI Landing Boost',
};

export default function PrivacidadPage() {
  // Detectar región del tenant si está autenticado, o usar default EU
  const region = 'EU'; // TODO: Obtener de tenant settings

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      
      {region === 'EU' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>1. Responsable del Tratamiento (GDPR)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                De acuerdo con el Reglamento General de Protección de Datos (RGPD), el responsable del tratamiento es:
              </p>
              {/* Contenido GDPR */}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>1. Responsable del Tratamiento (FADP)</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                De acuerdo con la Ley Federal de Protección de Datos (FADP) de Suiza:
              </p>
              {/* Contenido FADP */}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Datos Recopilados</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Recopilamos los siguientes tipos de datos:</p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>Datos de identificación (nombre, email)</li>
            <li>Datos de uso del servicio</li>
            <li>Datos de comunicación (mensajes, conversaciones)</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Derechos del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Usted tiene derecho a:</p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>Acceso a sus datos personales</li>
            <li>Rectificación de datos inexactos</li>
            <li>Supresión de datos ("derecho al olvido")</li>
            <li>Limitación del tratamiento</li>
            <li>Portabilidad de datos</li>
            <li>Oposición al tratamiento</li>
          </ul>
        </CardContent>
      </Card>

      {/* Más secciones... */}
    </div>
  );
}
```

---

### 3. Crear Página de Política de Cookies

**Archivo:** `apps/web/app/legal/cookies/page.tsx`

```typescript
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de AI Landing Boost',
};

export default function CookiesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Política de Cookies</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. ¿Qué son las Cookies?</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Tipos de Cookies Utilizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Cookies Técnicas (Necesarias)</h3>
              <p className="text-sm text-muted-foreground">
                Estas cookies son esenciales para el funcionamiento del sitio. No requieren consentimiento.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Cookies Analíticas</h3>
              <p className="text-sm text-muted-foreground">
                Nos ayudan a entender cómo los usuarios interactúan con el sitio. Requieren consentimiento.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Cookies de Marketing</h3>
              <p className="text-sm text-muted-foreground">
                Se utilizan para mostrar anuncios relevantes. Requieren consentimiento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Más secciones... */}
    </div>
  );
}
```

---

### 4. Crear Página de Términos y Condiciones

**Archivo:** `apps/web/app/legal/terminos/page.tsx`

```typescript
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de AI Landing Boost',
};

export default function TerminosPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. Aceptación de Términos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Al acceder y utilizar este servicio, usted acepta estar sujeto a estos términos y condiciones.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Descripción del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            AI Landing Boost es una plataforma SaaS que proporciona herramientas de automatización de conversaciones mediante IA.
          </p>
        </CardContent>
      </Card>

      {/* Más secciones... */}
    </div>
  );
}
```

---

### 5. Crear Componente de Consentimiento de Cookies

**Archivo:** `apps/web/components/cookie-consent.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/client';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export function CookieConsent() {
  const { t } = useTranslation('common');
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Verificar si ya hay consentimiento
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      date: new Date().toISOString(),
      analytics: true,
      marketing: true,
    }));
    setShow(false);
    // Activar cookies analíticas y de marketing
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      date: new Date().toISOString(),
      analytics: false,
      marketing: false,
    }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Cookie className="h-6 w-6 text-primary mt-1" />
            <div className="flex-1">
              <p className="text-sm">
                {t('cookies.banner_message')}{' '}
                <Link href="/legal/cookies" className="underline">
                  {t('cookies.learn_more')}
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReject}>
                {t('cookies.reject')}
              </Button>
              <Button size="sm" onClick={handleAccept}>
                {t('cookies.accept')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 6. Agregar Banner a Layout

**Archivo:** `apps/web/app/layout.tsx`

**Acción:** Agregar `<CookieConsent />` al layout principal

```typescript
import { CookieConsent } from '@/components/cookie-consent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

---

### 7. Agregar Links al Footer

**Archivo:** `apps/web/app/page.tsx` (o componente de footer)

**Acción:** Agregar sección de links legales

```typescript
<footer className="border-t py-8 mt-16">
  <div className="container mx-auto px-4">
    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
      <Link href="/legal/aviso-legal">Aviso Legal</Link>
      <Link href="/legal/privacidad">Política de Privacidad</Link>
      <Link href="/legal/cookies">Política de Cookies</Link>
      <Link href="/legal/terminos">Términos y Condiciones</Link>
    </div>
  </div>
</footer>
```

---

## Traducciones

**Archivo:** `apps/web/lib/i18n/locales/es/common.json`

```json
{
  "cookies": {
    "banner_message": "Utilizamos cookies para mejorar su experiencia. Al continuar navegando, acepta nuestro uso de cookies.",
    "learn_more": "Más información",
    "accept": "Aceptar",
    "reject": "Rechazar"
  }
}
```

---

## Validaciones

- **Consentimiento:** Verificar localStorage antes de activar cookies
- **Región:** Detectar región del tenant para mostrar contenido apropiado

---

## Errores Esperados

No se esperan errores críticos. Las páginas son estáticas.

---

## Test Plan

### Unit Tests

1. **CookieConsent:**
   - Muestra banner si no hay consentimiento
   - No muestra si ya hay consentimiento
   - Guarda preferencia correctamente

### Integration Tests

1. **Páginas legales:**
   - Todas las páginas son accesibles
   - Contenido se renderiza correctamente
   - Links funcionan

---

## Checklist Final

- [ ] Página de Aviso Legal creada
- [ ] Página de Política de Privacidad creada
- [ ] Página de Política de Cookies creada
- [ ] Página de Términos y Condiciones creada
- [ ] Componente CookieConsent creado
- [ ] Banner agregado al layout
- [ ] Links agregados al footer
- [ ] Traducciones agregadas (es/en)
- [ ] Contenido adaptado por región (EU/CH)
- [ ] Páginas son responsive

---

## Notas de Implementación

- **Contenido legal:** Considerar contratar abogado para revisar contenido
- **Actualización:** Las políticas deben actualizarse cuando cambien las prácticas
- **Versiones:** Considerar guardar versiones históricas para cumplimiento

---

**Última actualización:** 2025-01-XX

