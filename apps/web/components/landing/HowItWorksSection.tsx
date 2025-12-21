"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";

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
  const { t } = useTranslation("landing");

  const steps = [
    {
      number: 1,
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description"),
    },
    {
      number: 2,
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description"),
    },
    {
      number: 3,
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description"),
    },
    {
      number: 4,
      title: t("howItWorks.step4.title"),
      description: t("howItWorks.step4.description"),
    },
    {
      number: 5,
      title: t("howItWorks.step5.title"),
      description: t("howItWorks.step5.description"),
    },
    {
      number: 6,
      title: t("howItWorks.step6.title"),
      description: t("howItWorks.step6.description"),
    },
  ];

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
            <span className="text-foreground">{t("howItWorks.title")} </span>
            <span className="text-gradient">{t("howItWorks.titleHighlight")}</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
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
              <Image
                src="/assets/how-it-works-flow.png"
                alt="Diagrama del proceso de implementación de agente IA - Flujo circular de 6 pasos desde análisis hasta despliegue"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain"
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
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12"
        >
          {steps.slice(3).map((step) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="flex gap-3 sm:gap-4 group"
            >
              <div className="shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-base sm:text-lg text-primary-foreground shadow-glow group-hover:scale-110 transition-transform">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1.5 sm:mb-2 break-words">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
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
