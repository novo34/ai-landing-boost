'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/client';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

interface SessionExpiredBannerProps {
  onDismiss?: () => void;
}

export function SessionExpiredBanner({ onDismiss }: SessionExpiredBannerProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const handleLogout = () => {
    apiClient.controlledLogout(router);
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t('auth.session_expired_title')}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{t('auth.session_expired_message')}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="ml-4"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('auth.logout')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
