'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Upload, X, Palette, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BrandingPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [originalColors, setOriginalColors] = useState({ primary: '#3b82f6', secondary: '#8b5cf6' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await apiClient.getTenantSettings();
      if (response.success && response.data) {
        const primary = response.data.primaryColor || '#3b82f6';
        const secondary = response.data.secondaryColor || '#8b5cf6';
        setLogoUrl(response.data.logoUrl || null);
        setPrimaryColor(primary);
        setSecondaryColor(secondary);
        setOriginalColors({ primary, secondary });
        applyBranding(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('errors.generic'),
        description: t('branding.invalid_file_type'),
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('errors.generic'),
        description: t('branding.file_too_large'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.uploadLogo(file);
      if (response.success && response.data) {
        setLogoUrl(response.data.logoUrl);
        toast({
          title: t('branding.logo_uploaded'),
          description: t('branding.logo_uploaded_success'),
        });
        // Recargar settings para aplicar branding
        await loadSettings();
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.upload_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setLoading(true);
      const response = await apiClient.deleteLogo();
      if (response.success) {
        setLogoUrl(null);
        toast({
          title: t('branding.logo_deleted'),
          description: t('branding.logo_deleted_success'),
        });
        // Recargar settings
        await loadSettings();
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveColors = async () => {
    try {
      setLoading(true);
      const response = await apiClient.updateColors({
        primaryColor,
        secondaryColor,
      });
      if (response.success) {
        toast({
          title: t('branding.colors_updated'),
          description: t('branding.colors_updated_success'),
        });
        applyBranding({ primaryColor, secondaryColor });
      }
    } catch (error) {
      console.error('Error updating colors:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.save_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyBranding = (settings: { primaryColor?: string; secondaryColor?: string; logoUrl?: string }) => {
    // Inyectar CSS variables
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (settings.primaryColor) {
        root.style.setProperty('--primary', settings.primaryColor);
        root.style.setProperty('--primary-foreground', getContrastColor(settings.primaryColor));
      }
      if (settings.secondaryColor) {
        root.style.setProperty('--secondary', settings.secondaryColor);
        root.style.setProperty('--secondary-foreground', getContrastColor(settings.secondaryColor));
      }
    }
  };

  const getContrastColor = (hex: string): string => {
    // Convertir hex a RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Calcular luminosidad
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('branding.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('branding.description')}
        </p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branding.logo')}</CardTitle>
          <CardDescription>{t('branding.logo_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="relative inline-block border rounded p-4 bg-muted/50">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-12 max-w-[200px] object-contain"
                onError={(e) => {
                  // Si falla la carga, intentar con URL completa
                  const target = e.target as HTMLImageElement;
                  if (!target.src.startsWith('http')) {
                    target.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${logoUrl}`;
                  }
                }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleLogoUpload}
              disabled={loading}
              className="hidden"
              id="logo-upload"
            />
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <Button variant="outline" asChild disabled={loading}>
                <span>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {t('branding.upload_logo')}
                </span>
              </Button>
            </Label>
            {logoUrl && (
              <Button variant="outline" onClick={handleDeleteLogo} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                {t('branding.delete_logo')}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('branding.logo_hint')}
          </p>
        </CardContent>
      </Card>

      {/* Colores */}
      <Card>
        <CardHeader>
          <CardTitle>{t('branding.colors')}</CardTitle>
          <CardDescription>{t('branding.colors_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t('branding.primary_color')}</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={e => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setPrimaryColor(value);
                    }
                  }}
                  placeholder="#3b82f6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">{t('branding.secondary_color')}</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={e => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setSecondaryColor(value);
                    }
                  }}
                  placeholder="#8b5cf6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold mb-3">{t('branding.preview')}</h3>
            <div className="space-y-3">
              <div>
                <Button style={{ backgroundColor: primaryColor, color: getContrastColor(primaryColor) }} className="mr-2">
                  {t('branding.preview_button')}
                </Button>
                <Button variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>
                  {t('branding.preview_button_outline')}
                </Button>
              </div>
              <div>
                <a
                  href="#"
                  style={{ color: primaryColor }}
                  className="underline hover:opacity-80"
                  onClick={(e) => e.preventDefault()}
                >
                  {t('branding.preview_link')}
                </a>
              </div>
              <div className="p-3 rounded border" style={{ borderColor: secondaryColor, backgroundColor: `${secondaryColor}10` }}>
                <p className="text-sm">{t('branding.preview_card')}</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveColors} disabled={loading || primaryColor.length !== 7 || secondaryColor.length !== 7}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Palette className="h-4 w-4 mr-2" />
            )}
            {t('branding.save_colors')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
