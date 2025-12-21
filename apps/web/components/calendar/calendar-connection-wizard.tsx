'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient, CalendarCredentials } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Loader2, CheckCircle2, XCircle, Calendar } from 'lucide-react';

type Provider = 'CAL_COM' | 'GOOGLE' | 'CUSTOM' | null;
type Step = 'provider' | 'credentials' | 'validation' | 'success';

interface CalComCredentials {
  apiKey: string;
  eventTypeId: string;
}

interface GoogleCalendarCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
}

export default function CalendarConnectionWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<Provider>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean } | null>(null);

  // Cal.com credentials
  const [calComCreds, setCalComCreds] = useState<CalComCredentials>({
    apiKey: '',
    eventTypeId: '',
  });

  // Google Calendar credentials
  const [googleCreds, setGoogleCreds] = useState<GoogleCalendarCredentials>({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    calendarId: 'primary',
  });

  const handleProviderSelect = (value: string) => {
    setProvider(value as Provider);
    setStep('credentials');
  };

  const handleValidate = async () => {
    if (!provider) return;

    setValidating(true);
    setValidationResult(null);

    try {
      let credentials: CalendarCredentials;

      if (provider === 'CAL_COM') {
        credentials = {
          apiKey: calComCreds.apiKey,
          eventTypeId: calComCreds.eventTypeId,
        };
      } else if (provider === 'GOOGLE') {
        credentials = {
          clientId: googleCreds.clientId,
          clientSecret: googleCreds.clientSecret,
          refreshToken: googleCreds.refreshToken,
          calendarId: googleCreds.calendarId,
        };
      } else {
        toast({
          title: t('errors.generic'),
          description: t('calendar.custom_not_implemented'),
          variant: 'destructive',
        });
        setValidating(false);
        return;
      }

      // Validar credenciales llamando al endpoint de creación
      const response = await apiClient.createCalendarIntegration({
        provider,
        credentials,
      });

      if (response.success) {
        setValidationResult({ success: true });
        setStep('success');
      } else {
        setValidationResult({ success: false });
        toast({
          title: t('calendar.validation_failed'),
          description: response.error_key || t('calendar.invalid_credentials'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error validating credentials:', error);
      setValidationResult({ success: false });
      toast({
        title: t('errors.generic'),
        description: error.message || t('errors.validation_failed'),
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setStep('provider');
    setProvider(null);
    setCalComCreds({ apiKey: '', eventTypeId: '' });
    setGoogleCreds({ clientId: '', clientSecret: '', refreshToken: '', calendarId: 'primary' });
    setValidationResult(null);
    onClose();
  };

  const canProceedToValidation = () => {
    if (!provider) return false;
    
    if (provider === 'CAL_COM') {
      return calComCreds.apiKey.trim() !== '' && calComCreds.eventTypeId.trim() !== '';
    } else if (provider === 'GOOGLE') {
      return (
        googleCreds.clientId.trim() !== '' &&
        googleCreds.clientSecret.trim() !== '' &&
        googleCreds.refreshToken.trim() !== ''
      );
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('calendar.connect_calendar')}</DialogTitle>
          <DialogDescription>
            {t('calendar.connect_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Provider Selection */}
          {step === 'provider' && (
            <div className="space-y-4">
              <h3 className="font-semibold">{t('calendar.select_provider')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleProviderSelect('CAL_COM')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">Cal.com</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('calendar.cal_com_description')}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleProviderSelect('GOOGLE')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">Google Calendar</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('calendar.google_description')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 'credentials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {t('calendar.enter_credentials')}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('provider')}>
                  {t('calendar.back')}
                </Button>
              </div>

              {provider === 'CAL_COM' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="calComApiKey">{t('calendar.wizard.cal_com_api_key')} *</Label>
                    <Input
                      id="calComApiKey"
                      type="password"
                      value={calComCreds.apiKey}
                      onChange={(e) => setCalComCreds({ ...calComCreds, apiKey: e.target.value })}
                      placeholder="tu-api-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calComEventTypeId">{t('calendar.wizard.cal_com_event_type_id')} *</Label>
                    <Input
                      id="calComEventTypeId"
                      value={calComCreds.eventTypeId}
                      onChange={(e) => setCalComCreds({ ...calComCreds, eventTypeId: e.target.value })}
                      placeholder="123456"
                    />
                  </div>
                </div>
              ) : provider === 'GOOGLE' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="googleClientId">{t('calendar.wizard.google_client_id')} *</Label>
                    <Input
                      id="googleClientId"
                      value={googleCreds.clientId}
                      onChange={(e) => setGoogleCreds({ ...googleCreds, clientId: e.target.value })}
                      placeholder="xxxxx.apps.googleusercontent.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googleClientSecret">{t('calendar.wizard.google_client_secret')} *</Label>
                    <Input
                      id="googleClientSecret"
                      type="password"
                      value={googleCreds.clientSecret}
                      onChange={(e) => setGoogleCreds({ ...googleCreds, clientSecret: e.target.value })}
                      placeholder="GOCSPX-xxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googleRefreshToken">{t('calendar.wizard.google_refresh_token')} *</Label>
                    <Input
                      id="googleRefreshToken"
                      type="password"
                      value={googleCreds.refreshToken}
                      onChange={(e) => setGoogleCreds({ ...googleCreds, refreshToken: e.target.value })}
                      placeholder="1//xxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googleCalendarId">{t('calendar.wizard.google_calendar_id')}</Label>
                    <Input
                      id="googleCalendarId"
                      value={googleCreds.calendarId}
                      onChange={(e) => setGoogleCreds({ ...googleCreds, calendarId: e.target.value })}
                      placeholder="primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('calendar.calendar_id_hint')}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setStep('provider')}>
                  {t('calendar.back')}
                </Button>
                <Button onClick={handleValidate} disabled={!canProceedToValidation() || validating}>
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('calendar.validating')}
                    </>
                  ) : (
                    t('calendar.validate')
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Validation Result */}
          {step === 'validation' && validationResult && (
            <div className="space-y-4 text-center">
              {validationResult.success ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="font-semibold">{t('calendar.validation_success')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('calendar.integration_created')}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <h3 className="font-semibold">{t('calendar.validation_failed')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('calendar.check_credentials')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="font-semibold">{t('calendar.success')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('calendar.success_description')}
              </p>
              <Button onClick={handleClose} className="w-full">
                {t('calendar.close')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

