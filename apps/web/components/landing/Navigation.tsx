"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";
import { supportedLocales, type Locale } from "@/lib/i18n";

// Mapeo de códigos de idioma a sus nombres nativos
const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
};

export function Navigation() {
  const { t, locale, setLocale } = useTranslation("landing");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Optimizar scroll listener con throttling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cerrar menú móvil con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  // Prevenir scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: "#producto", label: t("nav.producto") },
    { href: "#como-funciona", label: t("nav.comoFunciona") },
    { href: "#beneficios", label: t("nav.beneficios") },
    { href: "#roi", label: t("nav.roi") },
    { href: "#faq", label: t("nav.faq") },
  ];

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setShowLangMenu(false);
  };

  // Manejar clic en enlace del menú móvil - cierre inmediato y scroll optimizado
  const handleMobileLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Cerrar menú inmediatamente sin esperar animaciones
    setIsMobileMenuOpen(false);
    
    // Si es un ancla, hacer scroll suave optimizado
    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Usar requestAnimationFrame para mejor rendimiento
        requestAnimationFrame(() => {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
    }
  };

  return (
    <>
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass-strong shadow-card" : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8" aria-label={t("nav.main_navigation")}>
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2 text-xl md:text-2xl font-display font-bold text-gradient"
            aria-label={t("nav.home_aria")}
          >
            <span className="text-2xl">⚡</span>
            AutomAI
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={t("nav.change_language")}
                aria-expanded={showLangMenu}
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase">{locale}</span>
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[120px]"
                  >
                    {supportedLocales.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => handleLanguageChange(loc)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors ${
                          locale === loc ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                        }`}
                      >
                        {localeNames[loc]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Login Button */}
            <Button variant="ghost" size="default" asChild>
              <a href="/login">{t("nav.login")}</a>
            </Button>
            
            {/* CTA Button */}
            <Button variant="hero" size="default" asChild>
              <a href="#roi">{t("nav.calcularRoi")}</a>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center touch-target rounded-lg hover:bg-secondary/50 active:bg-secondary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t("nav.cerrarMenu") : t("nav.abrirMenu")}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      </motion.header>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-[55]"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Menu - Fixed position below header */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden fixed top-16 left-0 right-0 w-full glass-strong border-t border-border shadow-lg z-[60] max-h-[calc(100vh-4rem)] overflow-y-auto safe-area-inset-top"
            role="navigation"
            aria-label={t("nav.main_navigation")}
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2 safe-area-inset-top">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-3 px-4 min-h-[44px] flex items-center touch-target rounded-lg hover:bg-secondary/50 active:bg-secondary"
                  onClick={(e) => handleMobileLinkClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              
              {/* Mobile Language Switcher */}
              <div className="flex items-center gap-2 py-3 px-4 border-t border-border mt-2">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground mr-auto">{t("nav.language")}:</span>
                <div className="flex items-center gap-2">
                  {supportedLocales.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => handleLanguageChange(loc)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-target ${
                        locale === loc
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="ghost" size="lg" className="mt-2 min-h-[44px] touch-target" asChild>
                <a href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  {t("nav.login")}
                </a>
              </Button>
              
              <Button variant="hero" size="lg" className="mt-2 min-h-[44px] touch-target" asChild>
                <a href="#roi" onClick={(e) => handleMobileLinkClick(e, "#roi")}>
                  {t("nav.calcularRoi")}
                </a>
              </Button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
