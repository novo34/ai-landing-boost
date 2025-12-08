import { Helmet } from "react-helmet-async";

interface SEOSchemaProps {
  locale?: string;
}

export function SEOSchema({ locale = "es" }: SEOSchemaProps) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AutomAI",
    alternateName: "AutomAI - Agencia de Automatización con IA",
    url: "https://automai.es",
    logo: "https://automai.es/logo.png",
    description:
      "Agencia especializada en automatización empresarial con inteligencia artificial. Desarrollamos agentes de IA personalizados para WhatsApp, automatización de procesos y cumplimiento normativo RGPD.",
    foundingDate: "2024",
    areaServed: {
      "@type": "Country",
      name: "Spain",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+34-900-000-000",
      contactType: "sales",
      availableLanguage: ["Spanish", "English"],
    },
    sameAs: [
      "https://linkedin.com/company/automai",
      "https://twitter.com/automai_es",
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Automatización Empresarial con IA",
    provider: {
      "@type": "Organization",
      name: "AutomAI",
    },
    description:
      "Desarrollo de agentes de IA personalizados para automatizar tareas repetitivas, atención al cliente 24/7 y reducción de costes operativos hasta un 70%.",
    serviceType: "AI Automation",
    areaServed: {
      "@type": "Country",
      name: "Spain",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios de Automatización IA",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Automatización WhatsApp Business",
            description:
              "Agentes conversacionales que atienden consultas, agendan citas y gestionan pedidos 24/7 en WhatsApp Business.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Automatización de Procesos",
            description:
              "Flujos de trabajo inteligentes que conectan tus herramientas y eliminan tareas manuales repetitivas.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Consultoría RGPD",
            description:
              "Soluciones conformes con la normativa europea de protección de datos y privacidad.",
          },
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cuánto tiempo tarda en implementarse un agente de IA?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El tiempo de implementación varía según la complejidad. Un agente básico de WhatsApp puede estar operativo en 2-4 semanas, mientras que una solución más compleja puede requerir 6-12 semanas.",
        },
      },
      {
        "@type": "Question",
        name: "¿Necesito conocimientos técnicos para usar la solución?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No, nuestras soluciones están diseñadas para ser utilizadas por personal no técnico. Proporcionamos formación completa y soporte técnico incluido.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cómo se integra con mis sistemas actuales?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nuestros agentes de IA se integran con la mayoría de sistemas empresariales: CRM, ERP, plataformas de e-commerce, y más mediante APIs estándar.",
        },
      },
      {
        "@type": "Question",
        name: "¿Qué garantías de seguridad y privacidad ofrecéis?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Todas nuestras soluciones cumplen con el RGPD y la LOPDGDD, implementando cifrado end-to-end y almacenamiento seguro en servidores europeos.",
        },
      },
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AutomAI",
    url: "https://automai.es",
    description:
      "Agencia de automatización empresarial con inteligencia artificial en España",
    inLanguage: "es-ES",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://automai.es/buscar?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(serviceSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}
