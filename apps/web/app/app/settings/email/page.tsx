'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle, Send, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  sentAt?: string;
  createdAt: string;
  provider: 'TENANT' | 'PLATFORM';
}

export default function EmailSettingsPage() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
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

  // Ref para rastrear si es la primera carga (evita problemas de closure)
  const isFirstLoadRef = useRef(true);

  // Cargar logs de emails con polling silencioso (cada 30 segundos)
  useEffect(() => {
    if (!showLogs) {
      isFirstLoadRef.current = true; // Reset cuando se oculta
      return;
    }

    const loadLogs = async () => {
      try {
        // Solo mostrar loading en la primera carga, no en actualizaciones silenciosas
        if (isFirstLoadRef.current) {
          setLogsLoading(true);
        }
        const response = await apiClient.get<{
          data: EmailLog[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/settings/email/logs?page=${logsPage}&limit=20`);
        if (response.success && response.data) {
          // Actualizar estado sin causar refrescos ni parpadeos
          // React actualizará solo los elementos que cambiaron
          setEmailLogs(response.data.data || []);
          setLogsTotal(response.data.pagination?.total || 0);
        }
      } catch (error) {
        // Silenciar errores de polling para no molestar al usuario
        console.debug('Error loading email logs:', error);
      } finally {
        if (isFirstLoadRef.current) {
          setLogsLoading(false);
          isFirstLoadRef.current = false;
        }
      }
    };

    // Cargar inmediatamente
    loadLogs();

    // Polling silencioso cada 30 segundos (sin refrescar página, sin mostrar loading)
    // Las actualizaciones de estado son reactivas y no causan refrescos
    const interval = setInterval(loadLogs, 30000);
    return () => {
      clearInterval(interval);
      isFirstLoadRef.current = true; // Reset para próxima vez
    };
  }, [showLogs, logsPage]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SmtpSettings>('/settings/email');
      if (response.success && response.data) {
        const settingsData = response.data;
        setSettings(settingsData);
        setFormData({
          fromName: settingsData.fromName || '',
          fromEmail: settingsData.fromEmail || '',
          replyTo: settingsData.replyTo || '',
          host: settingsData.host || '',
          port: settingsData.port || 587,
          secure: settingsData.secure || false,
          username: settingsData.username || '',
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
      // Preparar datos asegurando tipos correctos
      const dataToSend: any = {
        fromName: formData.fromName,
        fromEmail: formData.fromEmail,
        replyTo: formData.replyTo || undefined,
        host: formData.host,
        port: Number(formData.port) || 587, // Asegurar que sea número
        secure: Boolean(formData.secure), // Asegurar que sea boolean
        username: formData.username,
      };
      
      // No enviar password si está vacío (mantener el existente)
      if (formData.password && formData.password.trim() !== '') {
        dataToSend.password = formData.password;
      }
      
      const response = await apiClient.put<SmtpSettings>('/settings/email', dataToSend);
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
        '/settings/email/test',
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
          <CardTitle>{t('email.settings_title')}</CardTitle>
          <CardDescription>{t('email.settings_description')}</CardDescription>
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

      {/* Sección de Logs de Emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('email.logs_title')}</CardTitle>
              <CardDescription>{t('email.logs_description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowLogs(!showLogs);
                if (!showLogs) {
                  setLogsPage(1);
                }
              }}
            >
              {showLogs ? t('common.hide') : t('email.show_logs')}
            </Button>
          </div>
        </CardHeader>
        {showLogs && (
          <CardContent>
            {logsLoading && emailLogs.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : emailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('email.no_logs')}</p>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('email.log_date')}</TableHead>
                      <TableHead>{t('email.log_to')}</TableHead>
                      <TableHead>{t('email.log_subject')}</TableHead>
                      <TableHead>{t('email.log_status')}</TableHead>
                      <TableHead>{t('email.log_attempts')}</TableHead>
                      <TableHead>{t('email.log_provider')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{log.to}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === 'SENT'
                                ? 'default'
                                : log.status === 'FAILED'
                                  ? 'destructive'
                                  : log.status === 'SENDING'
                                    ? 'secondary'
                                    : 'outline'
                            }
                          >
                            {log.status === 'QUEUED' && <Clock className="h-3 w-3 mr-1" />}
                            {log.status === 'SENDING' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {log.status === 'SENT' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {log.status === 'FAILED' && <AlertCircle className="h-3 w-3 mr-1" />}
                            {t(`email.status_${log.status.toLowerCase()}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.attempts}/{log.maxAttempts}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{log.provider}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {logsTotal > 20 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('common.showing')} {(logsPage - 1) * 20 + 1} - {Math.min(logsPage * 20, logsTotal)} {t('common.of')} {logsTotal}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                        disabled={logsPage === 1}
                      >
                        {t('common.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage((p) => p + 1)}
                        disabled={logsPage * 20 >= logsTotal}
                      >
                        {t('common.next')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
