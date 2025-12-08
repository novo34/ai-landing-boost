import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/landing/Navigation";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductSection } from "@/components/landing/ProductSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { ROICalculatorSection } from "@/components/landing/ROICalculatorSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { SEOSchema } from "@/components/landing/SEOSchema";

const Index = () => {
  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>AutomAI - Agencia de Automatización con Inteligencia Artificial | España</title>
        <meta 
          name="description" 
          content="Automatiza tu negocio con IA. Desarrollamos agentes inteligentes para WhatsApp, automatización de procesos y atención 24/7. Reduce costes hasta un 70%. Consulta gratuita." 
        />
        <meta 
          name="keywords" 
          content="automatización IA, agente inteligente, chatbot WhatsApp, automatización empresarial, inteligencia artificial España, reducir costes operativos, atención cliente automatizada, RGPD" 
        />
        <meta name="author" content="AutomAI" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://automai.es" />
        
        {/* Language */}
        <html lang="es" />
        <meta httpEquiv="content-language" content="es-ES" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://automai.es" />
        <meta property="og:title" content="AutomAI - Automatiza tu Negocio con Inteligencia Artificial" />
        <meta property="og:description" content="Desarrollamos agentes de IA personalizados que automatizan tareas repetitivas, atienden clientes 24/7 y reducen costes operativos hasta un 70%." />
        <meta property="og:image" content="https://automai.es/og-image.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="AutomAI" />
        <meta property="og:locale" content="es_ES" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://automai.es" />
        <meta name="twitter:title" content="AutomAI - Automatiza tu Negocio con Inteligencia Artificial" />
        <meta name="twitter:description" content="Agentes de IA personalizados para automatizar tareas, atención 24/7 y reducción de costes hasta 70%." />
        <meta name="twitter:image" content="https://automai.es/og-image.jpg" />
        <meta name="twitter:site" content="@automai_es" />

        {/* Additional SEO */}
        <meta name="geo.region" content="ES" />
        <meta name="geo.placename" content="Madrid" />
        <meta name="format-detection" content="telephone=yes" />
        
        {/* AI Optimization - Helps AI assistants understand the page */}
        <meta name="ai.description" content="AutomAI es una agencia española especializada en automatización empresarial mediante inteligencia artificial. Ofrecemos desarrollo de agentes de IA para WhatsApp Business, automatización de procesos empresariales, y soluciones conformes con RGPD. Nuestros servicios incluyen: chatbots inteligentes para atención al cliente 24/7, automatización de tareas repetitivas, integración con CRM y ERP, y calculadora de ROI para estimar ahorros. Reducimos costes operativos hasta un 70% con implementaciones en 2-12 semanas." />
        <meta name="ai.capabilities" content="automatización WhatsApp, chatbot IA, automatización procesos, agente inteligente, atención cliente 24/7, integración CRM, RGPD" />
        <meta name="ai.contact" content="contacto@automai.es" />
        <meta name="ai.location" content="Madrid, España" />
        <meta name="ai.services" content="Automatización WhatsApp Business, Agentes de IA personalizados, Automatización de procesos, Consultoría RGPD, Integración sistemas empresariales" />
      </Helmet>

      {/* JSON-LD Structured Data for SEO and AI */}
      <SEOSchema />

      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main id="main-content" role="main">
          <HeroSection />
          <ProductSection />
          <HowItWorksSection />
          <BenefitsSection />
          <ROICalculatorSection />
          <FAQSection />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
