"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Linkedin, Twitter } from "lucide-react";

const footerLinks = {
  servicios: [
    { label: "Automatización WhatsApp", href: "#producto" },
    { label: "Agentes de IA", href: "#producto" },
    { label: "Integraciones", href: "#como-funciona" },
    { label: "Consultoría", href: "#roi" },
  ],
  empresa: [
    { label: "Sobre Nosotros", href: "#" },
    { label: "Casos de Éxito", href: "#beneficios" },
    { label: "Blog", href: "#" },
    { label: "Carreras", href: "#" },
  ],
  legal: [
    { label: "Política de Privacidad", href: "#" },
    { label: "Términos de Servicio", href: "#" },
    { label: "Política de Cookies", href: "#" },
    { label: "Aviso Legal", href: "#" },
  ],
};

export function Footer() {
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
              Agencia especializada en automatización empresarial con inteligencia artificial. 
              Transformamos la operación de tu negocio.
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
            <h3 className="font-semibold text-foreground mb-4">Servicios</h3>
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
            <h3 className="font-semibold text-foreground mb-4">Empresa</h3>
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
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
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
            © {new Date().getFullYear()} AutomAI. Todos los derechos reservados.
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
            Soluciones conformes con RGPD, LOPDGDD y normativa europea de protección de datos. 
            Servidores ubicados en la Unión Europea.
          </p>
        </div>
      </div>
    </footer>
  );
}
