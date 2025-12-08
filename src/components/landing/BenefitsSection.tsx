"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import benefitsImage from "@/assets/benefits-visual.png";

const benefits = [
  "Reducción del 70% en tareas administrativas repetitivas",
  "Atención al cliente automatizada 24 horas, 7 días",
  "Respuestas instantáneas sin tiempo de espera",
  "Escalabilidad sin aumentar plantilla",
  "Integración con sistemas existentes (CRM, ERP, etc.)",
  "Análisis y reporting automático de métricas",
  "Cumplimiento normativo RGPD garantizado",
  "ROI positivo en menos de 6 meses",
];

const useCases = [
  "Atención al cliente",
  "Gestión de citas",
  "Procesamiento de pedidos",
  "Soporte técnico",
  "Cualificación de leads",
  "Onboarding de clientes",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

export function BenefitsSection() {
  return (
    <section id="beneficios" className="section-padding bg-secondary/30" aria-labelledby="beneficios-heading">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12 md:mb-16"
        >
          <h2 id="beneficios-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
            <span className="text-foreground">Beneficios de </span>
            <span className="text-gradient">Automatizar con IA</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforma tu operación empresarial y obtén ventajas competitivas reales y medibles.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Benefits Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg aspect-[4/3]">
              <img
                src={benefitsImage}
                alt="Gráfico de crecimiento empresarial - Visualización de mejoras en eficiencia y reducción de costes con automatización IA"
                className="w-full h-full object-contain"
                loading="lazy"
              />
              {/* Glow effect */}
              <div className="absolute inset-0 -z-10 bg-gradient-glow blur-3xl opacity-50" aria-hidden="true" />
            </div>
          </motion.div>

          {/* Benefits List */}
          <div>
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 gap-4"
              role="list"
            >
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  variants={itemVariants}
                  className="flex items-start gap-3 group"
                >
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 group-hover:bg-primary/30 transition-colors">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {benefit}
                  </span>
                </motion.li>
              ))}
            </motion.ul>

            {/* Use Cases */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 p-6 rounded-xl bg-card border border-border"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Casos de Uso Principales
              </h3>
              <div className="flex flex-wrap gap-2">
                {useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                  >
                    {useCase}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
