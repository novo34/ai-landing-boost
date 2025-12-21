"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, Clock, Euro, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";
import { useToast } from "@/hooks/use-toast";

interface ROIData {
  sector?: string;
  numPeople: number;
  hoursPerWeek: number;
  hourlyCost: number;
  automationRate: number;
}

interface ROIResults {
  yearlyHours: number;
  currentYearlyCost: number;
  estimatedSavings: number;
  projectBudgetMin: number;
  projectBudgetMax: number;
  monthlyRetainer: number;
}

interface LeadFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

export function ROICalculatorSection() {
  const { t, locale } = useTranslation("landing");
  const { toast } = useToast();
  const [data, setData] = useState<ROIData>({
    sector: undefined,
    numPeople: 3,
    hoursPerWeek: 15,
    hourlyCost: 25,
    automationRate: 55,
  });
  const [results, setResults] = useState<ROIResults | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  // Cálculos según especificaciones
  const calculateROI = () => {
    const yearlyHours = data.numPeople * data.hoursPerWeek * 52;
    const currentYearlyCost = yearlyHours * data.hourlyCost;
    const estimatedSavings = currentYearlyCost * (data.automationRate / 100);

    // Recomendación de inversión: payback en ~3-6 meses
    // Objetivo: payback en ~3-4 meses (más agresivo)
    const recommendedProjectBudgetMin = estimatedSavings * 0.25; // payback ~3-4 meses
    // Más conservador: payback en ~6 meses
    const recommendedProjectBudgetMax = estimatedSavings * 0.5; // payback ~6 meses

    // Mantenimiento mensual estimado (10% del ahorro anual / 12)
    const recommendedMonthlyRetainer = (estimatedSavings * 0.1) / 12;

    setResults({
      yearlyHours,
      currentYearlyCost,
      estimatedSavings,
      projectBudgetMin: recommendedProjectBudgetMin,
      projectBudgetMax: recommendedProjectBudgetMax,
      monthlyRetainer: recommendedMonthlyRetainer,
    });
    setShowForm(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      style: "currency",
      currency: locale === "es" ? "EUR" : "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    if (!leadForm.name.trim() || !leadForm.email.trim()) {
      toast({
        title: t("common.error"),
        description: t("common.required"),
        variant: "destructive",
      });
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadForm.email)) {
      toast({
        title: t("common.error"),
        description: t("common.invalidEmail"),
        variant: "destructive",
      });
      return;
    }

    setSubmitState("loading");

    try {
      // Usar 127.0.0.1 en vez de localhost para evitar problemas de IPv6 en Windows
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3001";
      
      const response = await fetch(`${apiBaseUrl}/public/marketing/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone || undefined,
          company: leadForm.company || undefined,
          message: leadForm.message || undefined,
          locale: locale,
          source: "roi-calculator",
          // Datos de ROI calculados
          numPeople: data.numPeople,
          hoursPerWeek: data.hoursPerWeek,
          hourlyCost: data.hourlyCost,
          automationRate: data.automationRate,
          yearlyHours: results?.yearlyHours || 0,
          currentYearlyCost: results?.currentYearlyCost || 0,
          estimatedSavings: results?.estimatedSavings || 0,
          projectBudgetMin: results?.projectBudgetMin || 0,
          projectBudgetMax: results?.projectBudgetMax || 0,
          monthlyRetainer: results?.monthlyRetainer || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(t("roi_calculator.form_submit_error"));
      }

      setSubmitState("success");
      toast({
        title: t("common.success"),
        description: t("roi_calculator.form_submit_success"),
      });

      // Reset form
      setLeadForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (error) {
      console.error("Error submitting lead:", error);
      setSubmitState("error");
      toast({
        title: t("common.error"),
        description: t("roi_calculator.form_submit_error_description"),
        variant: "destructive",
      });
    }
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
            <span className="text-foreground">{t("roi.title")} </span>
            <span className="text-gradient">{t("roi.titleHighlight")}</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("roi.subtitle")}
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
              <Image
                src="/assets/roi-calculator-visual.png"
                alt={t("roi_calculator.roi_chart_alt")}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain"
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
            className="space-y-6"
          >
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10 border-b border-border">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Calculator className="w-6 h-6 text-primary" />
                  {t("roi.calculatorTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Sector (opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="sector">{t("roi.sector")}</Label>
                  <Select
                    value={data.sector || ""}
                    onValueChange={(value) => setData({ ...data, sector: value })}
                  >
                    <SelectTrigger id="sector">
                      <SelectValue placeholder={t("roi.sectorPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">{t("roi.sectorRetail")}</SelectItem>
                      <SelectItem value="healthcare">{t("roi.sectorHealthcare")}</SelectItem>
                      <SelectItem value="legal">{t("roi.sectorLegal")}</SelectItem>
                      <SelectItem value="real-estate">{t("roi.sectorRealEstate")}</SelectItem>
                      <SelectItem value="other">{t("roi.sectorOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Input: Personas */}
                <div className="space-y-2">
                  <Label htmlFor="numPeople">{t("roi.numPeople")}</Label>
                  <Input
                    id="numPeople"
                    type="number"
                    min="1"
                    max="20"
                    value={data.numPeople}
                    onChange={(e) => setData({ ...data, numPeople: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                {/* Input: Horas por semana */}
                <div className="space-y-2">
                  <Label htmlFor="hoursPerWeek">{t("roi.hoursPerWeek")}</Label>
                  <Input
                    id="hoursPerWeek"
                    type="number"
                    min="5"
                    max="40"
                    value={data.hoursPerWeek}
                    onChange={(e) => setData({ ...data, hoursPerWeek: parseFloat(e.target.value) || 5 })}
                    required
                  />
                </div>

                {/* Input: Coste por hora */}
                <div className="space-y-2">
                  <Label htmlFor="hourlyCost">{t("roi.hourlyCost")}</Label>
                  <Input
                    id="hourlyCost"
                    type="number"
                    min="15"
                    max="100"
                    step="0.5"
                    value={data.hourlyCost}
                    onChange={(e) => setData({ ...data, hourlyCost: parseFloat(e.target.value) || 15 })}
                    required
                  />
                </div>

                {/* Input: Porcentaje de automatización */}
                <div className="space-y-2">
                  <Label htmlFor="automationRate">{t("roi.automationRate")} ({data.automationRate}%)</Label>
                  <Input
                    id="automationRate"
                    type="number"
                    min="30"
                    max="80"
                    value={data.automationRate}
                    onChange={(e) => setData({ ...data, automationRate: parseFloat(e.target.value) || 50 })}
                    required
                  />
                </div>

                {/* Calculate Button */}
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={calculateROI}
                  disabled={!data.numPeople || !data.hoursPerWeek || !data.hourlyCost}
                >
                  {t("roi.calculate")}
                </Button>

                {/* Results */}
                {results && (
                  <div className="pt-6 border-t border-border space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                          <Euro className="w-3 h-3 sm:w-4 sm:h-4" />
                          {t("roi.currentYearlyCost")}
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-foreground break-words">
                          {formatCurrency(results.currentYearlyCost)}
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 rounded-lg bg-primary/10">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-1">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          {t("roi.estimatedSavings")}
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-primary break-words">
                          {formatCurrency(results.estimatedSavings)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm mb-2">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="break-words">{t("roi.projectBudgetMin")} - {t("roi.projectBudgetMax")}</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gradient mb-2 break-words">
                        {formatCurrency(results.projectBudgetMin)} - {formatCurrency(results.projectBudgetMax)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("roi.monthlyRetainer")}: {formatCurrency(results.monthlyRetainer)}
                      </div>
                    </div>

                    <Alert>
                      <AlertDescription className="text-xs">
                        {t("roi.note")}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Lead Form */}
                {showForm && results && (
                  <form onSubmit={handleSubmit} className="pt-6 border-t border-border space-y-4">
                    <h3 className="text-lg font-semibold">{t("roi.cta")}</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("common.name")} *</Label>
                      <Input
                        id="name"
                        type="text"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t("common.email")} *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("common.phone")}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">{t("common.company")}</Label>
                      <Input
                        id="company"
                        type="text"
                        value={leadForm.company}
                        onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t("common.message")}</Label>
                      <textarea
                        id="message"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full"
                      disabled={submitState === "loading"}
                    >
                      {submitState === "loading" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("loading")}
                        </>
                      ) : submitState === "success" ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("common.success")}
                        </>
                      ) : (
                        t("common.submit")
                      )}
                    </Button>

                    {submitState === "error" && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {t("roi_calculator.form_submit_error_retry")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
