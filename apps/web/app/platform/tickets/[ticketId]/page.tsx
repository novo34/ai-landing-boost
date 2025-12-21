'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { getSupportTicketDetails, addTicketMessage, updateSupportTicket, closeSupportTicket, type SupportTicket } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isInternal, setIsInternal] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await getSupportTicketDetails(ticketId);
      if (response.success && response.data) {
        setTicket(response.data);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setSendingMessage(true);
      const response = await addTicketMessage(ticketId, {
        message: message.trim(),
        isInternal: isInternal,
      });

      if (response.success) {
        setMessage('');
        setIsInternal(false);
        await loadTicket(); // Recargar ticket para ver el nuevo mensaje
        toast({
          title: t('success.message_sent'),
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm(t('tickets.details.close'))) return;

    try {
      const response = await closeSupportTicket(ticketId);
      if (response.success) {
        toast({
          title: t('success.ticket_closed'),
          variant: 'default',
        });
        await loadTicket();
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('common.loading', { ns: 'common' })}</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('errors.ticket_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{t(`tickets.status.${ticket.status.toLowerCase().replace('_', '_')}`)}</Badge>
            <Badge variant="outline">{t(`tickets.priority.${ticket.priority.toLowerCase()}`)}</Badge>
            <Badge variant="secondary">{t(`tickets.category.${ticket.category.toLowerCase()}`)}</Badge>
          </div>
        </div>
        {ticket.status !== 'CLOSED' && (
          <Button variant="outline" onClick={handleCloseTicket}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('tickets.details.close')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle>{t('tickets.details.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Mensajes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('tickets.details.messages')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.messages && ticket.messages.length > 0 ? (
                <div className="space-y-4">
                  {ticket.messages.map((msg) => (
                    <div key={msg.id} className={`p-4 rounded-lg ${msg.isInternal ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-muted'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{msg.user.name || msg.user.email}</span>
                          {msg.isInternal && (
                            <Badge variant="outline" className="text-xs">
                              {t('tickets.details.internal_note')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('common.no_data', { ns: 'common' })}</p>
              )}

              {/* Formulario para agregar mensaje */}
              {ticket.status !== 'CLOSED' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Textarea
                      placeholder={t('tickets.details.add_message')}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isInternal"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="isInternal" className="text-sm">
                        {t('tickets.details.internal_note')}
                      </label>
                    </div>
                  </div>
                  <Button onClick={handleSendMessage} disabled={sendingMessage || !message.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    {t('tickets.details.add_message')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar con información */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.information', { ns: 'common' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">{t('tickets.list.columns.tenant')}</Label>
                <p className="font-medium">
                  {ticket.tenant ? (
                    <Link href={`/platform/tenants/${ticket.tenant.id}`} className="hover:underline">
                      {ticket.tenant.name}
                    </Link>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('tickets.list.columns.assigned_to')}</Label>
                <p className="font-medium">
                  {ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email : '-'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('tickets.list.columns.created_at')}</Label>
                <p className="font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('tickets.list.columns.last_activity')}</Label>
                <p className="font-medium">{new Date(ticket.lastActivityAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
