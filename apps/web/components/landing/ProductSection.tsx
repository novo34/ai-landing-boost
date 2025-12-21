"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Zap, Shield } from "lucide-react";
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function ProductSection() {
  const { t } = useTranslation("landing");

  const features = [
    {
      icon: MessageSquare,
      title: t("product.whatsapp.title"),
      description: t("product.whatsapp.description"),
    },
    {
      icon: Zap,
      title: t("product.processes.title"),
      description: t("product.processes.description"),
    },
    {
      icon: Shield,
      title: t("product.compliance.title"),
      description: t("product.compliance.description"),
    },
  ];

  return (
    <section id="producto" className="section-padding bg-secondary/30" aria-labelledby="producto-heading">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12 md:mb-16"
        >
          <h2 id="producto-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
            <span className="text-foreground">{t("product.title")} </span>
            <span className="text-gradient">{t("product.titleHighlight")}</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("product.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1 flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg aspect-[4/3]">
              <Image
                src="/assets/product-integration-pillars.png"
                alt="Integración de módulos de automatización IA - WhatsApp, procesos empresariales y seguridad de datos conectados"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain animate-float"
                loading="lazy"
              />
              {/* Glow effect behind image */}
              <div className="absolute inset-0 -z-10 bg-gradient-glow blur-3xl opacity-50" aria-hidden="true" />
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="order-1 lg:order-2 space-y-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card variant="feature" className="group">
                  <CardHeader className="flex flex-row items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="mb-1.5 sm:mb-2 break-words">{feature.title}</CardTitle>
                      <CardDescription className="text-sm sm:text-base leading-relaxed break-words">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
