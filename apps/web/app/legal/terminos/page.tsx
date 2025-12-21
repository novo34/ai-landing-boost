import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de AutomAI',
};

export default async function TerminosPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. Aceptación de Términos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Al acceder y utilizar el servicio AutomAI, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
          </p>
          <p>
            Estos términos constituyen un acuerdo legalmente vinculante entre usted y AutomAI S.L. ("nosotros", "nuestro" o "la Empresa").
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Descripción del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            AutomAI es una plataforma SaaS (Software como Servicio) que proporciona herramientas de automatización de conversaciones mediante inteligencia artificial. El servicio incluye:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Gestión de conversaciones automatizadas</li>
            <li>Integración con WhatsApp y otros canales</li>
            <li>Agentes de IA personalizables</li>
            <li>Base de conocimiento para respuestas</li>
            <li>Gestión de citas y calendarios</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Cuentas de Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Para utilizar el servicio, debe crear una cuenta proporcionando información precisa y completa. Usted es responsable de:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Mantener la confidencialidad de sus credenciales de acceso</li>
            <li>Todas las actividades que ocurran bajo su cuenta</li>
            <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
            <li>Proporcionar información actualizada y precisa</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>4. Uso Aceptable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Usted se compromete a utilizar el servicio únicamente para fines legales y de acuerdo con estos términos. Queda estrictamente prohibido:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Utilizar el servicio para actividades ilegales o fraudulentas</li>
            <li>Enviar spam, mensajes no solicitados o contenido malicioso</li>
            <li>Violar derechos de propiedad intelectual de terceros</li>
            <li>Intentar acceder no autorizado a sistemas o datos</li>
            <li>Interferir con el funcionamiento del servicio</li>
            <li>Utilizar el servicio para acosar, amenazar o dañar a otros</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>5. Propiedad Intelectual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            El servicio y todo su contenido, incluyendo software, diseño, textos, gráficos, logos y otros materiales, son propiedad de AutomAI o de sus licenciantes y están protegidos por leyes de propiedad intelectual.
          </p>
          <p>
            Se le otorga una licencia limitada, no exclusiva y no transferible para utilizar el servicio según estos términos. Esta licencia no incluye el derecho de revender, redistribuir o crear trabajos derivados del servicio.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>6. Limitación de Responsabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            En la máxima medida permitida por la ley, AutomAI no será responsable de daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pero no limitado a pérdida de beneficios, datos o uso.
          </p>
          <p>
            Nuestra responsabilidad total hacia usted por cualquier reclamo relacionado con el servicio no excederá el monto que haya pagado a AutomAI en los doce (12) meses anteriores al reclamo.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>7. Modificaciones de Términos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en el sitio web.
          </p>
          <p>
            Su uso continuado del servicio después de cualquier modificación constituye su aceptación de los nuevos términos. Si no está de acuerdo con las modificaciones, debe dejar de utilizar el servicio.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>8. Cancelación y Terminación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Puede cancelar su cuenta en cualquier momento a través de la configuración de su cuenta. Nos reservamos el derecho de suspender o terminar su acceso al servicio inmediatamente, sin previo aviso, si viola estos términos.
          </p>
          <p>
            Tras la cancelación, sus datos se conservarán según nuestra Política de Privacidad y las obligaciones legales aplicables.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>9. Ley Aplicable y Jurisdicción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Estos términos se rigen por la legislación española. Para cualquier controversia que pudiera derivarse de estos términos o del uso del servicio, las partes se someten a los juzgados y tribunales de Madrid, España.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  );
}
