"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Cuánto tiempo tarda en implementarse un agente de IA?",
    answer: "El tiempo de implementación varía según la complejidad del proyecto. Un agente básico de WhatsApp puede estar operativo en 2-4 semanas, mientras que una solución de automatización más compleja puede requerir 6-12 semanas. Durante la consulta inicial, proporcionamos un cronograma detallado para tu caso específico.",
  },
  {
    question: "¿Necesito conocimientos técnicos para usar la solución?",
    answer: "No, nuestras soluciones están diseñadas para ser utilizadas por personal no técnico. Proporcionamos una interfaz intuitiva para gestionar y monitorizar los agentes, además de formación completa para tu equipo. El soporte técnico está incluido para resolver cualquier duda.",
  },
  {
    question: "¿Cómo se integra con mis sistemas actuales?",
    answer: "Nuestros agentes de IA se integran con la mayoría de sistemas empresariales: CRM (Salesforce, HubSpot, Pipedrive), ERP, plataformas de e-commerce, sistemas de ticketing, y más. Utilizamos APIs estándar y desarrollamos conectores personalizados cuando es necesario.",
  },
  {
    question: "¿Qué garantías de seguridad y privacidad ofrecéis?",
    answer: "Todas nuestras soluciones cumplen con el RGPD y la LOPDGDD. Implementamos cifrado end-to-end, almacenamiento seguro en servidores europeos, y controles de acceso estrictos. Firmamos acuerdos de confidencialidad y podemos adaptarnos a requisitos de seguridad específicos de tu sector.",
  },
  {
    question: "¿Qué pasa si el agente no sabe responder algo?",
    answer: "Los agentes están diseñados para escalar automáticamente a un humano cuando detectan consultas fuera de su ámbito o cuando el usuario lo solicita. Además, el sistema aprende continuamente de estas interacciones para mejorar sus respuestas futuras.",
  },
  {
    question: "¿Cuál es el coste de mantenimiento después de la implementación?",
    answer: "Ofrecemos planes de mantenimiento mensuales que incluyen: monitorización 24/7, actualizaciones de seguridad, ajustes de rendimiento, y soporte técnico. El coste típico es entre el 10-15% del valor inicial del proyecto por año, aunque varía según el alcance del servicio requerido.",
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
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export function FAQSection() {
  return (
    <section id="faq" className="section-padding bg-secondary/30" aria-labelledby="faq-heading">
      <div className="container mx-auto max-w-4xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12 md:mb-16"
        >
          <h2 id="faq-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
            <span className="text-foreground">Preguntas </span>
            <span className="text-gradient">Frecuentes</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Respuestas a las dudas más comunes sobre automatización con IA.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={itemVariants}>
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-glow transition-all"
                >
                  <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:text-primary py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Additional CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            ¿No encuentras la respuesta que buscas?
          </p>
          <a
            href="mailto:contacto@automai.es"
            className="text-primary hover:text-primary/80 font-semibold underline underline-offset-4 transition-colors"
          >
            Contacta con nosotros directamente
          </a>
        </motion.div>
      </div>
    </section>
  );
}
