"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";

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
  const { t } = useTranslation("landing");

  const benefits = [
    t("benefits.benefit1"),
    t("benefits.benefit2"),
    t("benefits.benefit3"),
    t("benefits.benefit4"),
    t("benefits.benefit5"),
    t("benefits.benefit6"),
    t("benefits.benefit7"),
    t("benefits.benefit8"),
  ];

  const useCases = [
    t("benefits.useCase1"),
    t("benefits.useCase2"),
    t("benefits.useCase3"),
    t("benefits.useCase4"),
    t("benefits.useCase5"),
    t("benefits.useCase6"),
  ];

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
            <span className="text-foreground">{t("benefits.title")} </span>
            <span className="text-gradient">{t("benefits.titleHighlight")}</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("benefits.subtitle")}
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
              <Image
                src="/assets/benefits-visual.png"
                alt="Gráfico de crecimiento empresarial - Visualización de mejoras en eficiencia y reducción de costes con automatización IA"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain"
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
              className="flex items-start gap-2 sm:gap-3 group"
            >
                  <div className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 group-hover:bg-primary/30 transition-colors">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  </div>
                  <span className="text-sm sm:text-base text-muted-foreground group-hover:text-foreground transition-colors break-words leading-relaxed flex-1">
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
              className="mt-8 sm:mt-10 p-4 sm:p-6 rounded-xl bg-card border border-border"
            >
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 break-words">
                {t("benefits.useCasesTitle")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {useCases.map((useCase) => (
                  <span
                    key={useCase}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm bg-primary/10 text-primary border border-primary/20 break-words"
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
