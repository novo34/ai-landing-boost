'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export function CookieConsent() {
  const { t } = useTranslation('common');
  const [show, setShow] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: true,
    marketing: true,
  });

  useEffect(() => {
    // Verificar si ya hay consentimiento
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        setShow(true);
      }
    }
  }, []);

  const handleAccept = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        accepted: true,
        date: new Date().toISOString(),
        analytics: true,
        marketing: true,
      }));
      setShow(false);
      // Aquí se pueden activar cookies analíticas y de marketing
    }
  };

  const handleReject = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        accepted: false,
        date: new Date().toISOString(),
        analytics: false,
        marketing: false,
      }));
      setShow(false);
    }
  };

  const handleCustomize = () => {
    setShowCustomize(true);
  };

  const handleSavePreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        accepted: true,
        date: new Date().toISOString(),
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      }));
      setShow(false);
      setShowCustomize(false);
      // Activar cookies según preferencias
      if (preferences.analytics) {
        // Activar cookies analíticas
      }
      if (preferences.marketing) {
        // Activar cookies de marketing
      }
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-background/95 backdrop-blur-sm border-t shadow-lg safe-area-inset-bottom md:z-50">
        <div className="max-w-6xl mx-auto p-3 sm:p-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              {/* Mobile-first: Stack verticalmente en móvil, horizontal en desktop */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icono y texto */}
                <div className="flex items-start gap-3 flex-1 min-w-0 w-full sm:w-auto">
                  <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-primary mt-0.5 sm:mt-1 flex-shrink-0" />
                  <p className="text-xs sm:text-sm leading-relaxed flex-1 min-w-0">
                    {t('cookies.banner_message')}{' '}
                    <Link href="/legal/cookies" className="underline text-primary hover:text-primary/80 whitespace-nowrap">
                      {t('cookies.learn_more')}
                    </Link>
                  </p>
                </div>
                
                {/* Botones: Apilados en móvil, en fila en desktop */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReject}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {t('cookies.reject')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCustomize}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {t('cookies.customize')}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleAccept}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {t('cookies.accept')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cookies.customize_title')}</DialogTitle>
            <DialogDescription>
              {t('cookies.customize_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">{t('cookies.analytics')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.analytics_description')}
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing">{t('cookies.marketing')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('cookies.marketing_description')}
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked })
                  }
                />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                <strong>{t('cookies.necessary')}</strong> {t('cookies.necessary_description')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomize(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSavePreferences}>
              {t('cookies.save_preferences')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
