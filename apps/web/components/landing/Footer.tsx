"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Linkedin, Twitter } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";

export function Footer() {
  const { t } = useTranslation("landing");

  const footerLinks = {
    servicios: [
      { label: t("footer.service1"), href: "#producto" },
      { label: t("footer.service2"), href: "#producto" },
      { label: t("footer.service3"), href: "#como-funciona" },
      { label: t("footer.service4"), href: "#roi" },
    ],
    empresa: [
      { label: t("footer.company1"), href: "#" },
      { label: t("footer.company2"), href: "#beneficios" },
      { label: t("footer.company3"), href: "#" },
      { label: t("footer.company4"), href: "#" },
    ],
    legal: [
      { label: t("footer.legal1"), href: "/legal/privacidad" },
      { label: t("footer.legal2"), href: "/legal/terminos" },
      { label: t("footer.legal3"), href: "/legal/cookies" },
      { label: t("footer.legal4"), href: "/legal/aviso-legal" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border" role="contentinfo">
      <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a
              href="#"
              className="flex items-center gap-2 text-2xl font-display font-bold text-gradient mb-4"
              aria-label="AutomAI - Inicio"
            >
              <span className="text-2xl">⚡</span>
              AutomAI
            </a>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {t("footer.description")}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:contacto@automai.es"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                contacto@automai.es
              </a>
              <a
                href="tel:+34900000000"
                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                +34 900 000 000
              </a>
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Madrid, España
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.services")}</h3>
            <ul className="space-y-3">
              {footerLinks.servicios.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.company")}</h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AutomAI. {t("footer.copyright")}
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Legal Compliance Strip */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            {t("footer.compliance")}
          </p>
        </div>
      </div>
    </footer>
  );
}
