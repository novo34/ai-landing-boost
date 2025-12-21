import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de AutomAI',
};

export default async function PrivacidadPage() {
  // Por defecto EU, en el futuro se puede obtener de tenant settings
  const region = 'EU';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      
      {region === 'EU' ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Responsable del Tratamiento (GDPR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              De acuerdo con el Reglamento General de Protección de Datos (RGPD) UE 2016/679, el responsable del tratamiento de sus datos personales es:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Responsable:</strong> AutomAI S.L.</li>
              <li><strong>CIF:</strong> B-12345678</li>
              <li><strong>Domicilio:</strong> Calle Ejemplo, 123, 28001 Madrid, España</li>
              <li><strong>Email:</strong> privacy@automai.es</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Responsable del Tratamiento (FADP)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              De acuerdo con la Ley Federal de Protección de Datos (FADP) de Suiza, el responsable del tratamiento de sus datos personales es:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Responsable:</strong> AutomAI S.L.</li>
              <li><strong>Domicilio:</strong> Calle Ejemplo, 123, 28001 Madrid, España</li>
              <li><strong>Email:</strong> privacy@automai.es</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>2. Datos Recopilados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Recopilamos los siguientes tipos de datos personales:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Datos de identificación:</strong> nombre, dirección de correo electrónico, número de teléfono</li>
            <li><strong>Datos de cuenta:</strong> información de registro y autenticación</li>
            <li><strong>Datos de uso del servicio:</strong> conversaciones, mensajes, citas programadas</li>
            <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, sistema operativo</li>
            <li><strong>Datos de facturación:</strong> información necesaria para el procesamiento de pagos</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>3. Finalidad del Tratamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Utilizamos sus datos personales para las siguientes finalidades:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Prestación del servicio de automatización de conversaciones</li>
            <li>Gestión de su cuenta y autenticación</li>
            <li>Comunicación con usted sobre el servicio</li>
            <li>Facturación y gestión de pagos</li>
            <li>Cumplimiento de obligaciones legales</li>
            <li>Mejora del servicio y análisis de uso</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>4. Base Legal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>El tratamiento de sus datos personales se basa en:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Ejecución de contrato:</strong> Para la prestación del servicio solicitado</li>
            <li><strong>Consentimiento:</strong> Para el envío de comunicaciones comerciales</li>
            <li><strong>Obligación legal:</strong> Para el cumplimiento de obligaciones fiscales y legales</li>
            <li><strong>Interés legítimo:</strong> Para la mejora del servicio y análisis</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>5. Conservación de Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Conservaremos sus datos personales durante el tiempo necesario para cumplir con las finalidades para las que fueron recopilados, y en cualquier caso, durante los plazos establecidos por la legislación aplicable.
          </p>
          <p>
            Una vez finalizado el período de conservación, los datos serán eliminados o anonimizados de forma segura.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>6. Derechos del Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Usted tiene derecho a:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Acceso:</strong> Obtener información sobre sus datos personales que tratamos</li>
            <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
            <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos ("derecho al olvido")</li>
            <li><strong>Limitación:</strong> Solicitar la limitación del tratamiento de sus datos</li>
            <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
            <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
          </ul>
          <p className="mt-4">
            Para ejercer sus derechos, puede contactarnos en: <a href="mailto:privacy@automai.es" className="text-primary underline">privacy@automai.es</a>
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>7. Transferencias Internacionales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Sus datos pueden ser transferidos y procesados en países fuera del Espacio Económico Europeo (EEE). En estos casos, garantizamos que se aplican las medidas de seguridad adecuadas y que las transferencias se realizan de conformidad con la normativa aplicable.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  );
}
