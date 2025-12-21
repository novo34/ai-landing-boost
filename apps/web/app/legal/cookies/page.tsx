import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de AutomAI',
};

export default async function CookiesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Política de Cookies</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. ¿Qué son las Cookies?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (ordenador, tablet o móvil) cuando visita nuestro sitio web. Las cookies nos permiten reconocer su dispositivo y recordar información sobre su visita, como sus preferencias de idioma y otras configuraciones.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Tipos de Cookies Utilizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Cookies Técnicas (Necesarias)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Estas cookies son esenciales para el funcionamiento del sitio web y no requieren su consentimiento. Incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Cookies de sesión para mantener su autenticación</li>
              <li>Cookies de seguridad para proteger contra ataques</li>
              <li>Cookies de preferencias de idioma</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Cookies Analíticas</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Nos ayudan a entender cómo los usuarios interactúan con nuestro sitio web. Estas cookies requieren su consentimiento:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Cookies de Google Analytics para análisis de tráfico</li>
              <li>Cookies de seguimiento de eventos y conversiones</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Cookies de Marketing</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Se utilizan para mostrar anuncios relevantes y medir la efectividad de nuestras campañas. Estas cookies requieren su consentimiento:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Cookies de seguimiento de publicidad</li>
              <li>Cookies de remarketing</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Cookies de Terceros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Nuestro sitio web puede utilizar servicios de terceros que instalan sus propias cookies. Estos servicios incluyen:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Google Analytics:</strong> Para análisis de uso del sitio web</li>
            <li><strong>Stripe:</strong> Para procesamiento de pagos</li>
          </ul>
          <p className="mt-4">
            Le recomendamos que consulte las políticas de privacidad de estos terceros para obtener más información sobre sus cookies.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>4. Cómo Desactivar las Cookies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Puede configurar su navegador para rechazar todas las cookies o para que le avise cuando un sitio web intente instalar una cookie. Sin embargo, si desactiva las cookies, es posible que algunas funcionalidades del sitio web no funcionen correctamente.
          </p>
          <p>
            Para obtener más información sobre cómo gestionar las cookies en su navegador, consulte la ayuda de su navegador:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-primary underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary underline">Safari</a></li>
            <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary underline">Microsoft Edge</a></li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>5. Actualización de la Política</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Podemos actualizar esta Política de Cookies ocasionalmente. Le notificaremos cualquier cambio publicando la nueva política en esta página y actualizando la fecha de "Última actualización".
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  );
}
