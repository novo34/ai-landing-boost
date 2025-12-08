"use client";

import { motion } from "framer-motion";
import howItWorksImage from "@/assets/how-it-works-flow.png";

const steps = [
  {
    number: 1,
    title: "Análisis de Procesos",
    description: "Identificamos las tareas repetitivas y cuellos de botella en tu operación actual.",
  },
  {
    number: 2,
    title: "Diseño de Solución",
    description: "Creamos una arquitectura de automatización personalizada para tu negocio.",
  },
  {
    number: 3,
    title: "Desarrollo del Agente",
    description: "Construimos y entrenamos tu agente IA con tu conocimiento empresarial.",
  },
  {
    number: 4,
    title: "Integración",
    description: "Conectamos el agente con tus sistemas existentes: CRM, ERP, WhatsApp, etc.",
  },
  {
    number: 5,
    title: "Testing y Optimización",
    description: "Probamos exhaustivamente y ajustamos el rendimiento antes del lanzamiento.",
  },
  {
    number: 6,
    title: "Despliegue y Soporte",
    description: "Activamos la solución en producción con monitorización y soporte continuo.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="section-padding" aria-labelledby="como-funciona-heading">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12 md:mb-16"
        >
          <h2 id="como-funciona-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
            <span className="text-foreground">Cómo Funciona </span>
            <span className="text-gradient">Nuestro Proceso</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Un proceso estructurado en 6 fases para garantizar el éxito de tu proyecto de automatización.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Steps - Left side */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {steps.slice(0, 3).map((step) => (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className="flex gap-4 group"
              >
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-lg text-primary-foreground shadow-glow group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Center Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center order-first lg:order-none"
          >
            <div className="relative w-full max-w-md aspect-square">
              <img
                src={howItWorksImage}
                alt="Diagrama del proceso de implementación de agente IA - Flujo circular de 6 pasos desde análisis hasta despliegue"
                className="w-full h-full object-contain"
                loading="lazy"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 -z-10 bg-gradient-glow blur-3xl opacity-40" aria-hidden="true" />
            </div>
          </motion.div>
        </div>

        {/* Second row of steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
        >
          {steps.slice(3).map((step) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="flex gap-4 group"
            >
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-lg text-primary-foreground shadow-glow group-hover:scale-110 transition-transform">
                  {step.number}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
