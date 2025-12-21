import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Aviso Legal',
  description: 'Aviso legal de AutomAI',
};

export default async function AvisoLegalPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Aviso Legal</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>1. Datos de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa que:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Denominación social:</strong> AutomAI S.L.</li>
            <li><strong>CIF/NIF:</strong> B-12345678</li>
            <li><strong>Domicilio social:</strong> Calle Ejemplo, 123, 28001 Madrid, España</li>
            <li><strong>Email de contacto:</strong> legal@automai.es</li>
            <li><strong>Teléfono:</strong> +34 900 000 000</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Condiciones de Uso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            El acceso y uso de este sitio web implica la aceptación de las presentes condiciones de uso. El usuario se compromete a utilizar el sitio web de conformidad con la ley, las buenas costumbres y el presente aviso legal.
          </p>
          <p>
            Queda prohibido el uso del sitio web con fines ilícitos o no autorizados, así como cualquier uso que pueda dañar, inutilizar, sobrecargar o deteriorar el sitio web o impedir la normal utilización del mismo por parte de otros usuarios.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Propiedad Intelectual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Todos los contenidos del sitio web, incluyendo textos, gráficos, logos, iconos, imágenes, clips de audio, descargas digitales, compilaciones de datos y software, son propiedad de AutomAI o de sus proveedores de contenido y están protegidos por las leyes de propiedad intelectual e industrial.
          </p>
          <p>
            Queda prohibida la reproducción, distribución, comunicación pública y transformación de los contenidos de este sitio web sin la autorización expresa y por escrito de AutomAI.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>4. Limitación de Responsabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            AutomAI no se hace responsable de los daños y perjuicios de toda naturaleza que puedan deberse a la falta de disponibilidad, continuidad, calidad o utilidad de la información, contenidos y servicios ofrecidos en el sitio web.
          </p>
          <p>
            Asimismo, AutomAI no se responsabiliza de los daños y perjuicios que puedan derivarse del uso indebido del sitio web o de sus contenidos por parte de los usuarios.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>5. Legislación Aplicable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            El presente aviso legal se rige por la legislación española. Para cualquier controversia que pudiera derivarse del acceso o uso de este sitio web, AutomAI y el usuario se someten a los juzgados y tribunales del domicilio del usuario.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  );
}
