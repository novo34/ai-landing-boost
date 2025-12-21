import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n/client";
import { detectLocale } from "@/lib/i18n";
import { CookieConsent } from "@/components/cookie-consent";
import { measureServer } from "@/lib/perf/perfLogger";
import { ClientPerfInit } from "@/lib/perf/client-perf-init";
import { PERF_FLAGS } from "@/lib/perf/feature-flags";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://automai.es"),
  title: {
    default: "AutomAI - Agencia de Automatización con Inteligencia Artificial | España",
    template: "%s | AutomAI",
  },
  description:
    "Automatiza tu negocio con IA. Desarrollamos agentes inteligentes para WhatsApp, automatización de procesos y atención 24/7. Reduce costes hasta un 70%. Consulta gratuita.",
  keywords: [
    "automatización IA",
    "agente inteligente",
    "chatbot WhatsApp",
    "automatización empresarial",
    "inteligencia artificial España",
    "reducir costes operativos",
    "atención cliente automatizada",
    "RGPD",
    "automatización procesos",
    "IA empresarial",
  ],
  authors: [{ name: "AutomAI" }],
  creator: "AutomAI",
  publisher: "AutomAI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://automai.es",
    title: "AutomAI - Automatiza tu Negocio con Inteligencia Artificial",
    description:
      "Desarrollamos agentes de IA personalizados que automatizan tareas repetitivas, atienden clientes 24/7 y reducen costes operativos hasta un 70%.",
    siteName: "AutomAI",
    locale: "es_ES",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/assets/hero-ai-automation.png",
        width: 1200,
        height: 630,
        alt: "AutomAI - Automatización Empresarial con IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutomAI - Automatiza tu Negocio con Inteligencia Artificial",
    description:
      "Agentes de IA personalizados para automatizar tareas, atención 24/7 y reducción de costes hasta 70%.",
    site: "@automai_es",
    creator: "@automai_es",
    images: ["/assets/hero-ai-automation.png"],
  },
  alternates: {
    canonical: "https://automai.es",
    languages: {
      "es-ES": "https://automai.es?lang=es",
      "en-US": "https://automai.es?lang=en",
    },
  },
  category: "technology",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover", // Para soportar safe-area-inset en iOS
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return await measureServer('RootLayout.render', async () => {
    const locale = await measureServer('RootLayout.detectLocale', () => detectLocale());
    
    return (
      <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <ClientPerfInit />
        <TooltipProvider>
          {PERF_FLAGS.DISABLE_I18N_PROVIDER ? (
            <>
              {children}
              {!PERF_FLAGS.DISABLE_COOKIE_CONSENT && <CookieConsent />}
              {!PERF_FLAGS.DISABLE_TOASTER && <Toaster />}
              {!PERF_FLAGS.DISABLE_SONNER && <Sonner />}
            </>
          ) : (
            <LocaleProvider initialLocale={locale}>
              {children}
              {!PERF_FLAGS.DISABLE_COOKIE_CONSENT && <CookieConsent />}
              {!PERF_FLAGS.DISABLE_TOASTER && <Toaster />}
              {!PERF_FLAGS.DISABLE_SONNER && <Sonner />}
            </LocaleProvider>
          )}
        </TooltipProvider>
      </body>
      </html>
    );
  });
}

