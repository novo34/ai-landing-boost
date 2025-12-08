"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-ai-automation.png";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 md:pt-32 md:pb-24 px-4 md:px-6 lg:px-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Automatización empresarial con inteligencia artificial - Visualización de redes neuronales y flujos de datos automatizados"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 z-0 hero-pattern" aria-hidden="true" />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl"
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center space-y-6 md:space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="glow" className="text-xs md:text-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Agencia de Automatización con IA
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold tracking-tight"
          >
            <span className="text-foreground">Automatiza tu Negocio con</span>
            <br />
            <span className="text-gradient">Inteligencia Artificial</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Desarrollamos agentes de IA personalizados que automatizan tareas repetitivas, 
            atienden clientes 24/7 y reducen costes operativos hasta un 70%.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Button variant="hero" size="xl" asChild>
              <a href="#roi">
                Calcular mi ROI
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <a href="mailto:contacto@automai.es">
                Hablar con un Experto
              </a>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="pt-8 md:pt-12 flex flex-wrap justify-center items-center gap-6 md:gap-12 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-gradient">+50</span>
              <span className="text-sm">Empresas Automatizadas</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-border" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-gradient">70%</span>
              <span className="text-sm">Reducción de Costes</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-border" aria-hidden="true" />
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-gradient">24/7</span>
              <span className="text-sm">Atención Automática</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        aria-hidden="true"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
}
