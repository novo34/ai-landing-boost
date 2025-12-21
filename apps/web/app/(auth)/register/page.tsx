'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { getDashboardRoute, type TenantRole } from '@/lib/utils/roles';
import { AuthManager } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    tenantName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('auth.email_required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.email_invalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.password_required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.password_min_length');
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = t('auth.password_requirements');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.password_mismatch');
    }

    if (!formData.tenantName) {
      newErrors.tenantName = t('auth.tenant_name_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.register(
        formData.email,
        formData.password,
        formData.name || undefined,
        formData.tenantName,
      );

      if (response.success) {
        toast({
          title: t('auth.register_success'),
          description: t('auth.welcome'),
        });
        
        // Invalidar cache y obtener estado actualizado
        const authManager = AuthManager.getInstance();
        authManager.invalidateCache();
        
        // Obtener estado para redirigir al dashboard correcto
        // En registro, el usuario siempre será OWNER del tenant creado
        const state = await authManager.bootstrap();
        if (state.tenant?.role) {
          const dashboardRoute = getDashboardRoute(state.tenant.role as TenantRole);
          console.log(`🎯 Redirigiendo a dashboard según rol ${state.tenant.role}: ${dashboardRoute}`);
          router.push(dashboardRoute);
        } else {
          // Fallback a /app si no se puede determinar el rol
          console.warn('⚠️ No se pudo determinar el rol, redirigiendo a /app');
          router.push('/app');
        }
      } else {
        toast({
          title: t('auth.register_error'),
          description: response.error_key || t('errors.generic'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('errors.generic'),
        description: t('errors.network_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.register_title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.register_description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.email_placeholder')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name_optional')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.name_placeholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantName">{t('auth.tenant_name')}</Label>
              <Input
                id="tenantName"
                type="text"
                placeholder={t('auth.tenant_name_placeholder')}
                value={formData.tenantName}
                onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                disabled={loading}
                className={errors.tenantName ? 'border-destructive' : ''}
              />
              {errors.tenantName && (
                <p className="text-sm text-destructive">{errors.tenantName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirm_password')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={loading}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('loading') : t('auth.register')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('auth.or_continue_with')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                  window.location.href = `${apiUrl}/auth/google`;
                }}
                disabled={loading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.google')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                  window.location.href = `${apiUrl}/auth/microsoft`;
                }}
                disabled={loading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none">
                  <path fill="#F25022" d="M0 0h11v11H0z" />
                  <path fill="#7FBA00" d="M12 0h11v11H12z" />
                  <path fill="#00A4EF" d="M0 12h11v11H0z" />
                  <path fill="#FFB900" d="M12 12h11v11H12z" />
                </svg>
                {t('auth.microsoft')}
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              {t('auth.have_account')}{' '}
              <Link href="/login" className="text-primary hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

