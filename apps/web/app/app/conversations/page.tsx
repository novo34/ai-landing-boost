'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Archive, ArchiveRestore, Send, Search, User, Bot, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { VirtualList } from '@/components/ui/virtual-list';

interface Conversation {
  id: string;
  tenantId: string;
  whatsappAccountId: string;
  agentId?: string;
  agent?: { id: string; name: string };
  participantPhone: string;
  participantName?: string;
  status: string;
  lastMessageAt?: string;
  unreadCount: number;
  messageCount: number;
  detectedLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  type: string;
  direction: string;
  content: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  language?: string;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
}

export default function ConversationsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filters, setFilters] = useState({
    agentId: 'all',
    status: 'all',
  });

  useEffect(() => {
    loadConversations();
    loadAgents();
  }, [filters]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getConversations({
        agentId: filters.agentId || undefined,
        status: filters.status || undefined,
        limit: 50,
      });
      if (response.success && response.data) {
        const conversationsData = response.data.data || [];
        setConversations(conversationsData);
        // Si no hay conversación seleccionada y hay conversaciones, seleccionar la primera
        if (!selectedConversation && conversationsData.length > 0) {
          setSelectedConversation(conversationsData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await apiClient.getConversationMessages(conversationId, { limit: 100 });
      if (response.success && response.data) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageContent.trim()) {
      return;
    }

    try {
      setSendingMessage(true);
      const response = await apiClient.sendConversationMessage(
        selectedConversation.id,
        messageContent.trim()
      );
      if (response.success && response.data) {
        // Agregar mensaje a la lista localmente
        setMessages([...messages, {
          id: response.data.id,
          conversationId: response.data.conversationId,
          type: response.data.type,
          direction: response.data.direction,
          content: response.data.content,
          status: response.data.status,
          createdAt: response.data.createdAt,
        }]);
        setMessageContent('');
        toast({
          title: t('conversations.message_sent'),
          description: t('conversations.message_sent_success'),
        });
        // Recargar conversaciones para actualizar lastMessageAt
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t('conversations.message_send_failed'),
        description: t('errors.send_failed'),
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleArchive = async (conversationId: string, archive: boolean) => {
    try {
      const response = archive
        ? await apiClient.archiveConversation(conversationId)
        : await apiClient.unarchiveConversation(conversationId);
      
      if (response.success) {
        toast({
          title: archive ? t('conversations.archived_success') : t('conversations.unarchived_success'),
          description: archive ? t('conversations.archived_success_description') : t('conversations.unarchived_success_description'),
        });
        loadConversations();
        if (selectedConversation?.id === conversationId) {
          // Si la conversación seleccionada fue archivada, deseleccionar
          if (archive) {
            setSelectedConversation(null);
            setMessages([]);
          }
        }
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return t('common.yesterday');
    } else if (days < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      ACTIVE: 'default',
      ARCHIVED: 'secondary',
      CLOSED: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {t(`conversations.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          {t('conversations.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('conversations.description')}
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('conversations.filter_by_agent')}</label>
              <Select
                value={filters.agentId}
                onValueChange={(value) => setFilters({ ...filters, agentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('conversations.all_agents')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('conversations.all_agents')}</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('conversations.filter_by_status')}</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('conversations.all_statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('conversations.all_statuses')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('conversations.active')}</SelectItem>
                  <SelectItem value="ARCHIVED">{t('conversations.archived')}</SelectItem>
                  <SelectItem value="CLOSED">{t('conversations.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista de Conversaciones */}
        <Card className="lg:max-h-[calc(100vh-300px)]">
          <CardHeader>
            <CardTitle>{t('conversations.title')}</CardTitle>
            <CardDescription>
              {conversations?.length || 0} {(conversations?.length || 0) === 1 ? t('conversations.conversation_singular') : t('conversations.conversation_plural')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {t('conversations.no_conversations')}
                </p>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {t('conversations.no_conversations_description')}
                </p>
              </div>
            ) : conversations.length < 20 ? (
              // Para listas pequeñas, no usar virtualización
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {(conversations || []).map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        'p-4 cursor-pointer hover:bg-accent transition-colors',
                        selectedConversation?.id === conversation.id && 'bg-accent'
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium truncate">
                              {conversation.participantName || conversation.participantPhone}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="default" className="ml-auto">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {conversation.agent && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                              <Bot className="h-3 w-3" />
                              <span>{conversation.agent.name}</span>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.messageCount} {conversation.messageCount === 1 ? t('conversations.message_singular') : t('conversations.message_plural')}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.lastMessageAt)}
                            </span>
                            {getStatusBadge(conversation.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              // Para listas grandes, usar virtualización
              <VirtualList
                items={conversations}
                estimateSize={120}
                overscan={5}
                className="h-[600px]"
                emptyMessage={t('conversations.no_conversations')}
                emptyIcon={<MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />}
                renderItem={(conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-accent transition-colors border-b',
                      selectedConversation?.id === conversation.id && 'bg-accent'
                    )}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium truncate">
                            {conversation.participantName || conversation.participantPhone}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="ml-auto">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conversation.agent && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <Bot className="h-3 w-3" />
                            <span>{conversation.agent.name}</span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.messageCount} {conversation.messageCount === 1 ? t('conversations.message_singular') : t('conversations.message_plural')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conversation.lastMessageAt)}
                          </span>
                          {getStatusBadge(conversation.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Vista de Mensajes */}
        <Card className="lg:max-h-[calc(100vh-300px)] flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedConversation.participantName || selectedConversation.participantPhone}
                    </CardTitle>
                    <CardDescription>
                      {selectedConversation.agent?.name && (
                        <span>{t('conversations.agent')}: {selectedConversation.agent.name}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedConversation.status === 'ARCHIVED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(selectedConversation.id, false)}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        {t('conversations.unarchive')}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchive(selectedConversation.id, true)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        {t('conversations.archive')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">{t('conversations.loading_messages')}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">
                      {t('conversations.no_messages')}
                    </p>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {t('conversations.no_messages_description')}
                    </p>
                  </div>
                ) : messages.length < 30 ? (
                  // Para listas pequeñas, no usar virtualización
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-4 py-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-lg p-3',
                              message.direction === 'OUTBOUND'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs opacity-70">
                                {formatDate(message.createdAt)}
                              </span>
                              {message.direction === 'OUTBOUND' && (
                                <Badge variant="secondary" className="text-xs">
                                  {t(`conversations.${message.status.toLowerCase()}`)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  // Para listas grandes, usar virtualización
                  <div className="flex-1 px-4">
                    <VirtualList
                      items={messages}
                      estimateSize={100}
                      overscan={5}
                      className="h-full"
                      emptyMessage={t('conversations.no_messages')}
                      emptyIcon={<MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />}
                      renderItem={(message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex py-2',
                            message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-lg p-3',
                              message.direction === 'OUTBOUND'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs opacity-70">
                                {formatDate(message.createdAt)}
                              </span>
                              {message.direction === 'OUTBOUND' && (
                                <Badge variant="secondary" className="text-xs">
                                  {t(`conversations.${message.status.toLowerCase()}`)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}
                <Separator />
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('conversations.type_message')}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || sendingMessage}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {t('conversations.no_conversations')}
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {t('conversations.no_conversations_description')}
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

