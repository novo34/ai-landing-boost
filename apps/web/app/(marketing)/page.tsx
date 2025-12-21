import dynamic from "next/dynamic";
import { SEOSchema } from "@/components/landing/SEOSchema";
import { detectLocale } from "@/lib/i18n";
import { measureServer } from "@/lib/perf/perfLogger";

// Dynamic imports para componentes pesados con framer-motion
// Esto reduce el bundle inicial en ~50KB
const Navigation = dynamic(() => import("@/components/landing/Navigation").then(mod => ({ default: mod.Navigation })), {
  ssr: true, // Navigation debe estar en SSR para SEO
});

const HeroSection = dynamic(() => import("@/components/landing/HeroSection").then(mod => ({ default: mod.HeroSection })), {
  ssr: true,
});

const ProductSection = dynamic(() => import("@/components/landing/ProductSection").then(mod => ({ default: mod.ProductSection })), {
  ssr: true,
});

const HowItWorksSection = dynamic(() => import("@/components/landing/HowItWorksSection").then(mod => ({ default: mod.HowItWorksSection })), {
  ssr: true,
});

const BenefitsSection = dynamic(() => import("@/components/landing/BenefitsSection").then(mod => ({ default: mod.BenefitsSection })), {
  ssr: true,
});

const ROICalculatorSection = dynamic(() => import("@/components/landing/ROICalculatorSection").then(mod => ({ default: mod.ROICalculatorSection })), {
  ssr: true,
});

const FAQSection = dynamic(() => import("@/components/landing/FAQSection").then(mod => ({ default: mod.FAQSection })), {
  ssr: true,
});

const Footer = dynamic(() => import("@/components/landing/Footer").then(mod => ({ default: mod.Footer })), {
  ssr: true,
});

export default async function HomePage() {
  return await measureServer('MarketingPage.render', async () => {
    const locale = await detectLocale();
    
    return (
      <>
        <SEOSchema locale={locale} />
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
  });
}

