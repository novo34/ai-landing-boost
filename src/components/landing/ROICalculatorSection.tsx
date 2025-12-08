"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Clock, Euro } from "lucide-react";
import roiImage from "@/assets/roi-calculator-visual.png";

interface ROIData {
  personas: number;
  horasSemana: number;
  salarioHora: number;
}

export function ROICalculatorSection() {
  const [data, setData] = useState<ROIData>({
    personas: 3,
    horasSemana: 15,
    salarioHora: 25,
  });

  // Calculations
  const horasAnuales = data.personas * data.horasSemana * 52;
  const costeAnual = horasAnuales * data.salarioHora;
  
  // Project pricing (20-30% of annual cost)
  const precioMin = costeAnual * 0.2;
  const precioMax = costeAnual * 0.3;
  
  // Monthly savings (assuming 70% efficiency)
  const ahorroMensual = (costeAnual * 0.7) / 12;
  
  // ROI in months
  const roiMesesMin = precioMin / ahorroMensual;
  const roiMesesMax = precioMax / ahorroMensual;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <section id="roi" className="section-padding" aria-labelledby="roi-heading">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-12 md:mb-16"
        >
          <h2 id="roi-heading" className="text-3xl md:text-4xl lg:text-5xl font-display font-bold">
            <span className="text-foreground">Calcula tu </span>
            <span className="text-gradient">Retorno de Inversión</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Descubre cuánto puedes ahorrar automatizando las tareas repetitivas de tu equipo.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* ROI Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center lg:sticky lg:top-24"
          >
            <div className="relative w-full max-w-md aspect-square">
              <img
                src={roiImage}
                alt="Gráfico de retorno de inversión - Visualización del crecimiento y ahorro con automatización IA"
                className="w-full h-full object-contain"
                loading="lazy"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-glow blur-3xl opacity-40" aria-hidden="true" />
            </div>
          </motion.div>

          {/* Calculator */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10 border-b border-border">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calculator className="w-6 h-6 text-primary" />
                  Calculadora ROI
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                {/* Input: Personas */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="personas-slider" className="text-sm font-medium text-foreground">
                      Personas en tareas repetitivas
                    </label>
                    <span className="text-2xl font-bold text-gradient">{data.personas}</span>
                  </div>
                  <Slider
                    id="personas-slider"
                    value={[data.personas]}
                    onValueChange={([value]) => setData({ ...data, personas: value })}
                    min={1}
                    max={20}
                    step={1}
                    className="cursor-pointer"
                    aria-label="Número de personas"
                  />
                </div>

                {/* Input: Horas por semana */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="horas-slider" className="text-sm font-medium text-foreground">
                      Horas/semana en tareas automatizables
                    </label>
                    <span className="text-2xl font-bold text-gradient">{data.horasSemana}h</span>
                  </div>
                  <Slider
                    id="horas-slider"
                    value={[data.horasSemana]}
                    onValueChange={([value]) => setData({ ...data, horasSemana: value })}
                    min={5}
                    max={40}
                    step={1}
                    className="cursor-pointer"
                    aria-label="Horas por semana"
                  />
                </div>

                {/* Input: Salario por hora */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label htmlFor="salario-slider" className="text-sm font-medium text-foreground">
                      Coste/hora empleado (con SS)
                    </label>
                    <span className="text-2xl font-bold text-gradient">{data.salarioHora}€</span>
                  </div>
                  <Slider
                    id="salario-slider"
                    value={[data.salarioHora]}
                    onValueChange={([value]) => setData({ ...data, salarioHora: value })}
                    min={15}
                    max={60}
                    step={1}
                    className="cursor-pointer"
                    aria-label="Coste por hora"
                  />
                </div>

                {/* Results */}
                <div className="pt-6 border-t border-border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Euro className="w-4 h-4" />
                        Coste Anual Actual
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {formatCurrency(costeAnual)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Ahorro Mensual
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {formatCurrency(ahorroMensual)}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                      <Clock className="w-4 h-4" />
                      ROI Estimado
                    </div>
                    <div className="text-3xl font-bold text-gradient">
                      {roiMesesMin.toFixed(1)} - {roiMesesMax.toFixed(1)} meses
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Inversión estimada: {formatCurrency(precioMin)} - {formatCurrency(precioMax)}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <Button variant="hero" size="xl" className="w-full" asChild>
                  <a href="mailto:contacto@automai.es?subject=Solicitud%20de%20Presupuesto%20Automatización%20IA">
                    Solicitar Presupuesto Personalizado
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
