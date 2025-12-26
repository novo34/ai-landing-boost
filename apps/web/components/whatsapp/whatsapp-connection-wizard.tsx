'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Loader2, CheckCircle2, XCircle, QrCode, ExternalLink } from 'lucide-react';
import Image from 'next/image';

type Provider = 'EVOLUTION_API' | 'WHATSAPP_CLOUD' | null;
type Step = 'provider' | 'credentials' | 'validation' | 'success';

interface EvolutionCredentials {
  apiKey: string;
  instanceName: string;
  baseUrl: string;
}

interface WhatsAppCloudCredentials {
  accessToken: string;
  phoneNumberId: string;
  appId?: string;
  appSecret?: string;
}

export default function WhatsAppConnectionWizard({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const router = useRouter();
  const [step, setStep] = useState<Step>('provider');
  const [provider, setProvider] = useState<Provider>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; qrCodeUrl?: string | null; existingAccountId?: string; instanceName?: string } | null>(null);
  const successNotifiedRef = useRef(false);

  // Evolution API credentials
  const [evolutionCreds, setEvolutionCreds] = useState<EvolutionCredentials>({
    apiKey: '',
    instanceName: '',
    baseUrl: 'https://api.evolution-api.com',
  });

  // WhatsApp Cloud credentials
  const [whatsappCloudCreds, setWhatsappCloudCreds] = useState<WhatsAppCloudCredentials>({
    accessToken: '',
    phoneNumberId: '',
    appId: '',
    appSecret: '',
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
      let response;
      
      if (provider === 'EVOLUTION_API') {
        // Para Evolution API, primero verificar si el tenant tiene conexión configurada
        const connectionStatus = await apiClient.getEvolutionConnectionStatus();
        
        if (connectionStatus.success && connectionStatus.data?.status === 'CONNECTED') {
          // Tenant tiene conexión Evolution → usar createEvolutionInstance (crea instancia real)
          // El instanceName se normaliza automáticamente en backend (agrega prefijo si falta)
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[WhatsApp Wizard] Creating instance with Evolution connection:', {
              instanceName: evolutionCreds.instanceName || 'auto-generated',
              endpoint: '/whatsapp/accounts',
              payload: { instanceName: evolutionCreds.instanceName || undefined },
            });
          }
          response = await apiClient.createEvolutionInstance({
            instanceName: evolutionCreds.instanceName || undefined,
            phoneNumber: undefined, // Se puede agregar después si es necesario
          });
        } else {
          // Tenant NO tiene conexión → usar flujo legacy para conectar Evolution primero
          // Esto crea/actualiza TenantEvolutionConnection
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[WhatsApp Wizard] Connecting Evolution API first:', {
              baseUrl: evolutionCreds.baseUrl,
              endpoint: '/whatsapp/evolution/connect',
            });
          }
          const connectResponse = await apiClient.connectEvolution({
            baseUrl: evolutionCreds.baseUrl,
            apiKey: evolutionCreds.apiKey,
            testConnection: true,
          });
          
          if (!connectResponse.success) {
            throw new Error(connectResponse.error_key || 'whatsapp.evolution_connection_failed');
          }
          
          // Después de conectar, crear la instancia
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.log('[WhatsApp Wizard] Creating instance after connecting Evolution:', {
              instanceName: evolutionCreds.instanceName || 'auto-generated',
              endpoint: '/whatsapp/accounts',
              payload: { instanceName: evolutionCreds.instanceName || undefined },
            });
          }
          response = await apiClient.createEvolutionInstance({
            instanceName: evolutionCreds.instanceName || undefined,
            phoneNumber: undefined,
          });
        }
      } else {
        // WhatsApp Cloud API usa el flujo legacy
        const credentials = whatsappCloudCreds;
        response = await apiClient.createWhatsAppAccount({
          provider: 'WHATSAPP_CLOUD',
          credentials,
        });
      }

      if (response.success) {
        setValidationResult({
          success: true,
          qrCodeUrl: response.data?.qrCodeUrl || null,
        });
        setStep('success');
        // Notificar al padre que se creó exitosamente la cuenta (solo una vez)
        if (onSuccess && !successNotifiedRef.current) {
          successNotifiedRef.current = true;
          onSuccess();
        }
      } else {
        // Detectar error 409 (Conflict) con existingAccountId
        const isConflict = response.error_key === 'whatsapp.account_already_exists' && response.existingAccountId;
        
        setValidationResult({
          success: false,
          existingAccountId: response.existingAccountId,
          instanceName: response.instanceName,
        });
        
        // Mostrar mensaje de error m?s descriptivo
        // Usar error_key traducido o mensaje gen?rico
        let errorMessage = t('whatsapp.invalid_credentials');
        if (isConflict) {
          errorMessage = t('whatsapp.account_already_exists');
        } else if (response.error_key) {
          // Intentar traducir el error_key, o usar el error_key como mensaje
          try {
            const translated = t(response.error_key);
            // Si la traducci?n existe y no es igual al error_key, usarla
            if (translated !== response.error_key) {
              errorMessage = translated;
            } else {
              // Si no hay traducci?n, usar el error_key como mensaje
              errorMessage = response.error_key;
            }
          } catch {
            // Si falla la traducci?n, usar el error_key como mensaje
            errorMessage = response.error_key;
          }
        }
        
        // Log para debugging
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.error('Error validating WhatsApp credentials:', {
            response,
            errorMessage,
            error_key: response.error_key,
            existingAccountId: response.existingAccountId,
          });
        }
        
        toast({
          title: isConflict ? t('whatsapp.validation_failed') : t('whatsapp.validation_failed'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error validating credentials:', error);
      
      // El cliente API puede devolver errores como excepciones o como objetos ApiResponse
      // Si el error tiene response.data, es una excepci?n de fetch
      // Si el error tiene error_key directamente, es un ApiResponse con error
      const errorData = error.response?.data || error;
      const status = error.response?.status || error.status;
      const isConflict = errorData?.error_key === 'whatsapp.account_already_exists' && errorData?.existingAccountId;
      const isPersistenceError = errorData?.error_key === 'whatsapp.persistence_error' || status >= 500;
      const existingAccountId = errorData?.existingAccountId;
      const instanceName = errorData?.instanceName;
      
      setValidationResult({
        success: false,
        existingAccountId,
        instanceName,
      });
      
      // Extraer mensaje de error m?s descriptivo
      let errorMessage = t('errors.validation_failed');
      let errorTitle = t('whatsapp.validation_failed');
      
      if (isConflict && existingAccountId) {
        // Error de cuenta duplicada
        errorMessage = t('whatsapp.account_already_exists');
        errorTitle = t('whatsapp.validation_failed');
      } else if (isPersistenceError) {
        // Error de persistencia (500+): mostrar mensaje de error interno
        errorMessage = t('whatsapp.persistence_error');
        errorTitle = t('errors.generic');
      } else if (status === 400 || status === 401 || status === 403) {
        // Errores de validaci?n: mostrar "credenciales inv?lidas"
        errorMessage = t('whatsapp.invalid_credentials');
        errorTitle = t('whatsapp.validation_failed');
      } else if (error.message) {
        errorMessage = error.message;
      } else if (errorData?.error_key) {
        // Intentar traducir el error_key
        try {
          const translated = t(errorData.error_key);
          if (translated !== errorData.error_key) {
            errorMessage = translated;
          } else {
            errorMessage = errorData.error_key;
          }
        } catch {
          errorMessage = errorData.error_key;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
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
    setEvolutionCreds({
      apiKey: '',
      instanceName: '',
      baseUrl: 'https://api.evolution-api.com',
    });
    setWhatsappCloudCreds({
      accessToken: '',
      phoneNumberId: '',
      appId: '',
      appSecret: '',
    });
    setValidationResult(null);
    successNotifiedRef.current = false; // Reset flag para la próxima vez
    onClose();
  };

  const canProceedToValidation = () => {
    if (!provider) return false;
    
    if (provider === 'EVOLUTION_API') {
      // instanceName es opcional, solo requiere apiKey
      return evolutionCreds.apiKey.trim() !== '';
    } else {
      return whatsappCloudCreds.accessToken.trim() !== '' && whatsappCloudCreds.phoneNumberId.trim() !== '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('whatsapp.wizard.title')}
          </DialogTitle>
          <DialogDescription>
            {t('whatsapp.wizard.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step === 'provider' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'provider' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">{t('whatsapp.wizard.step1')}</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className={`flex items-center ${step === 'credentials' ? 'text-primary' : step === 'validation' || step === 'success' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'credentials' ? 'bg-primary text-primary-foreground' : step === 'validation' || step === 'success' ? 'bg-muted' : 'bg-muted'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">{t('whatsapp.wizard.step2')}</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className={`flex items-center ${step === 'validation' || step === 'success' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'validation' || step === 'success' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {step === 'success' ? <CheckCircle2 className="h-4 w-4" /> : '3'}
              </div>
              <span className="ml-2 text-sm font-medium">{t('whatsapp.wizard.step3')}</span>
            </div>
          </div>

          {/* Step 1: Provider Selection */}
          {step === 'provider' && (
            <div className="space-y-4">
              <Label>{t('whatsapp.wizard.select_provider')}</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  className={`cursor-pointer transition-all hover:border-primary ${provider === 'EVOLUTION_API' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => handleProviderSelect('EVOLUTION_API')}
                >
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">Evolution API</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('whatsapp.wizard.evolution_description')}
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-all hover:border-primary ${provider === 'WHATSAPP_CLOUD' ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => handleProviderSelect('WHATSAPP_CLOUD')}
                >
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2">WhatsApp Cloud API</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('whatsapp.wizard.cloud_description')}
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
                  {t('whatsapp.wizard.enter_credentials')}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('provider')}>
                  {t('whatsapp.wizard.back')}
                </Button>
              </div>

              {provider === 'EVOLUTION_API' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t('whatsapp.wizard.api_key')} *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={evolutionCreds.apiKey}
                      onChange={(e) => setEvolutionCreds({ ...evolutionCreds, apiKey: e.target.value })}
                      placeholder="tu-api-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instanceName">Nombre de instancia (opcional)</Label>
                    <Input
                      id="instanceName"
                      value={evolutionCreds.instanceName}
                      onChange={(e) => setEvolutionCreds({ ...evolutionCreds, instanceName: e.target.value })}
                      placeholder="Se generará automáticamente si se deja vacío"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si proporcionas un nombre, se normalizará automáticamente con el prefijo del tenant
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">{t('whatsapp.wizard.base_url')}</Label>
                    <Input
                      id="baseUrl"
                      value={evolutionCreds.baseUrl}
                      onChange={(e) => setEvolutionCreds({ ...evolutionCreds, baseUrl: e.target.value })}
                      placeholder="https://api.evolution-api.com"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">{t('whatsapp.wizard.access_token')} *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={whatsappCloudCreds.accessToken}
                      onChange={(e) => setWhatsappCloudCreds({ ...whatsappCloudCreds, accessToken: e.target.value })}
                      placeholder="tu-access-token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">{t('whatsapp.wizard.phone_number_id')} *</Label>
                    <Input
                      id="phoneNumberId"
                      value={whatsappCloudCreds.phoneNumberId}
                      onChange={(e) => setWhatsappCloudCreds({ ...whatsappCloudCreds, phoneNumberId: e.target.value })}
                      placeholder="123456789012345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appId">App ID (opcional)</Label>
                    <Input
                      id="appId"
                      value={whatsappCloudCreds.appId}
                      onChange={(e) => setWhatsappCloudCreds({ ...whatsappCloudCreds, appId: e.target.value })}
                      placeholder="tu-app-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appSecret">App Secret (opcional)</Label>
                    <Input
                      id="appSecret"
                      type="password"
                      value={whatsappCloudCreds.appSecret}
                      onChange={(e) => setWhatsappCloudCreds({ ...whatsappCloudCreds, appSecret: e.target.value })}
                      placeholder="tu-app-secret"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep('provider')}>
                  {t('whatsapp.wizard.back')}
                </Button>
                <Button onClick={handleValidate} disabled={!canProceedToValidation() || validating}>
                  {validating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('whatsapp.wizard.validating')}
                    </>
                  ) : (
                    t('whatsapp.wizard.validate')
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Validation Result / Success */}
          {(step === 'validation' || step === 'success') && validationResult && (
            <div className="space-y-4">
              {validationResult.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-semibold">
                      {t('whatsapp.wizard.success')}
                    </h3>
                  </div>
                  
                  {validationResult.qrCodeUrl && provider === 'EVOLUTION_API' && (
                    <div className="space-y-2">
                      <Label>{t('whatsapp.wizard.qr_code')}</Label>
                      <div className="flex justify-center p-4 bg-muted rounded-lg">
                        <Image
                          src={validationResult.qrCodeUrl}
                          alt="QR Code"
                          width={256}
                          height={256}
                          className="rounded"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {t('whatsapp.wizard.qr_instructions')}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleClose}>
                      {t('whatsapp.wizard.finish')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <h3 className="font-semibold">
                      {t('whatsapp.wizard.error')}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {validationResult.existingAccountId 
                      ? t('whatsapp.account_already_exists')
                      : t('whatsapp.wizard.error_description')}
                  </p>
                  {validationResult.existingAccountId && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">
                        {validationResult.instanceName 
                          ? `${t('whatsapp.wizard.instance_name')}: ${validationResult.instanceName}`
                          : t('whatsapp.account_already_exists')}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleClose();
                          router.push('/app/settings/whatsapp');
                          // Scroll a la cuenta despu?s de un breve delay para que la p?gina cargue
                          setTimeout(() => {
                            const element = document.querySelector(`[data-account-id="${validationResult.existingAccountId}"]`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Highlight temporal
                              element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                              setTimeout(() => {
                                element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                              }, 3000);
                            }
                          }, 500);
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('whatsapp.go_to_existing_account')}
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep('credentials')}>
                      {t('whatsapp.wizard.try_again')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

