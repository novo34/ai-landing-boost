'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SmtpSettings {
  id?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export default function PlatformEmailSettingsPage() {
  const t = useTranslation('common');
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [formData, setFormData] = useState<SmtpSettings>({
    fromName: '',
    fromEmail: '',
    replyTo: '',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data: SmtpSettings }>('/platform/settings/email');
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData({
          fromName: response.data.fromName || '',
          fromEmail: response.data.fromEmail || '',
          replyTo: response.data.replyTo || '',
          host: response.data.host || '',
          port: response.data.port || 587,
          secure: response.data.secure || false,
          username: response.data.username || '',
          password: '', // Nunca recibimos password
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t('errors.generic'),
        description: t('email.load_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const response = await apiClient.put<{ data: SmtpSettings }>('/platform/settings/email', formData);
      if (response.success) {
        await loadSettings();
        toast({
          title: t('email.settings_saved'),
          description: t('email.settings_saved_success'),
        });
        setTestResult({ success: true, message: t('email.settings_saved') });
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key || t('email.save_error'),
          variant: 'destructive',
        });
        setTestResult({ success: false, message: response.error_key || t('email.save_error') });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('errors.generic'),
        description: t('email.save_error'),
        variant: 'destructive',
      });
      setTestResult({ success: false, message: t('email.save_error') });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast({
        title: t('errors.generic'),
        description: t('email.test_email_required'),
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const response = await apiClient.post<{ data: { success: boolean; message: string } }>(
        '/platform/settings/email/test',
        {
          to: testEmail,
          subject: testSubject || undefined,
        },
      );
      if (response.success) {
        toast({
          title: t('email.test_sent_success'),
          description: t('email.test_sent_message'),
        });
        setTestResult({ success: true, message: t('email.test_sent_success') });
        setTestDialogOpen(false);
        setTestEmail('');
        setTestSubject('');
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key || t('email.test_error'),
          variant: 'destructive',
        });
        setTestResult({ success: false, message: response.error_key || t('email.test_error') });
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      const errorMessage = error?.message || t('email.test_error');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('email.platform_settings_title')}</CardTitle>
          <CardDescription>{t('email.platform_settings_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('email.from_name')}</Label>
              <Input
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                placeholder={t('email.from_name_placeholder')}
              />
            </div>
            <div>
              <Label>{t('email.from_email')}</Label>
              <Input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
            <div>
              <Label>
                {t('email.reply_to')} ({t('common.optional')})
              </Label>
              <Input
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                placeholder="reply@example.com"
              />
            </div>
            <div>
              <Label>{t('email.host')}</Label>
              <Input
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label>{t('email.port')}</Label>
              <Input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="secure" className="cursor-pointer">
                {t('email.secure')}
              </Label>
            </div>
            <div>
              <Label>{t('email.username')}</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={t('email.username_placeholder')}
              />
            </div>
            <div>
              <Label>{t('email.password')}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={settings ? t('email.password_unchanged') : t('email.password_placeholder')}
              />
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              {t('common.save')}
            </Button>
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={testing}>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('email.send_test')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('email.send_test')}</DialogTitle>
                  <DialogDescription>{t('email.test_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>{t('email.test_to')} *</Label>
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                  <div>
                    <Label>{t('email.test_subject')} ({t('common.optional')})</Label>
                    <Input
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder={t('email.test_subject_placeholder')}
                    />
                  </div>
                  {testResult && (
                    <Alert variant={testResult.success ? 'default' : 'destructive'}>
                      {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <AlertDescription>{testResult.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleTest} disabled={testing || !testEmail}>
                    {testing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                    {t('email.send_test')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {settings && settings.updatedAt && (
            <div className="mt-4">
              <Badge variant="outline">
                {t('email.last_updated')}: {new Date(settings.updatedAt).toLocaleString()}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
