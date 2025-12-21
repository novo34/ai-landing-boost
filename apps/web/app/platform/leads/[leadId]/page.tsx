'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { getLeadDetails, updateLead, addLeadNote, type Lead } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const leadId = params.leadId as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: '',
    stage: '',
    assignedToId: '',
    notes: '',
  });
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const response = await getLeadDetails(leadId);
      if (response.success && response.data) {
        setLead(response.data);
        setFormData({
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone || '',
          status: response.data.status,
          stage: response.data.stage,
          assignedToId: response.data.assignedToId || '',
          notes: response.data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateLead(leadId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        status: formData.status as any,
        stage: formData.stage as any,
        assignedToId: formData.assignedToId || undefined,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        toast({
          title: t('success.lead_updated'),
          variant: 'default',
        });
        await loadLead();
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await addLeadNote(leadId, newNote.trim());
      if (response.success) {
        setNewNote('');
        toast({
          title: t('success.note_added'),
          variant: 'default',
        });
        await loadLead();
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

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('errors.lead_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{lead.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{t(`leads.status.${lead.status.toLowerCase()}`)}</Badge>
            <Badge variant="outline">{t(`leads.stage.${lead.stage.toLowerCase()}`)}</Badge>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {t('common.save', { ns: 'common' })}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Información del lead */}
          <Card>
            <CardHeader>
              <CardTitle>{t('leads.details.info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('operations.leads.create.form.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('operations.leads.create.form.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('operations.leads.create.form.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t('leads.list.columns.status')}</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">{t('leads.status.new')}</SelectItem>
                      <SelectItem value="CONTACTED">{t('leads.status.contacted')}</SelectItem>
                      <SelectItem value="QUALIFIED">{t('leads.status.qualified')}</SelectItem>
                      <SelectItem value="OPPORTUNITY">{t('leads.status.opportunity')}</SelectItem>
                      <SelectItem value="CUSTOMER">{t('leads.status.customer')}</SelectItem>
                      <SelectItem value="LOST">{t('leads.status.lost')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">{t('leads.list.columns.stage')}</Label>
                <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD_CAPTURED">{t('leads.stage.lead_captured')}</SelectItem>
                    <SelectItem value="CONTACTED">{t('leads.stage.contacted')}</SelectItem>
                    <SelectItem value="QUALIFIED">{t('leads.stage.qualified')}</SelectItem>
                    <SelectItem value="DEMO">{t('leads.stage.demo')}</SelectItem>
                    <SelectItem value="PROPOSAL">{t('leads.stage.proposal')}</SelectItem>
                    <SelectItem value="NEGOTIATION">{t('leads.stage.negotiation')}</SelectItem>
                    <SelectItem value="CLOSED_WON">{t('leads.stage.closed_won')}</SelectItem>
                    <SelectItem value="CLOSED_LOST">{t('leads.stage.closed_lost')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('operations.leads.create.form.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>{t('leads.details.notes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.leadnotes && lead.leadnotes.length > 0 ? (
                <div className="space-y-4">
                  {lead.leadnotes.map((note) => (
                    <div key={note.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{note.user.name || note.user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('common.no_data', { ns: 'common' })}</p>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Textarea
                  placeholder={t('operations.leads.add_note.placeholder')}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  {t('leads.details.add_note')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.information', { ns: 'common' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">{t('leads.list.columns.source')}</Label>
                <p className="font-medium">{t(`leads.source.${lead.source.toLowerCase()}`)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('leads.list.columns.created_at')}</Label>
                <p className="font-medium">{new Date(lead.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">{t('leads.list.columns.updated_at')}</Label>
                <p className="font-medium">{new Date(lead.updatedAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
