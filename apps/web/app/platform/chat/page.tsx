'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listActiveChatConversations, getChatHistory, sendChatMessage, type PlatformChatMessage } from '@/lib/api/platform-client';
import { AuthManager } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlatformChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const initChat = async () => {
      // Obtener usuario actual usando AuthManager
      try {
        const authManager = AuthManager.getInstance();
        const state = authManager.getState();
        if (state.user?.id) {
          setUserId(state.user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }

      await loadConversations();
    };

    initChat();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Conectar WebSocket
    // Obtener URL base de la API (similar a como lo hace apiClient)
    const getApiBaseUrl = () => {
      if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      }
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      }
      const localIpPattern = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/;
      if (localIpPattern.test(hostname)) {
        return `http://${hostname}:3001`;
      }
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    };

    const apiUrl = getApiBaseUrl();
    const newSocket = io(`${apiUrl}/platform-chat`, {
      auth: {
        userId,
      },
    });

    newSocket.on('connect', () => {
      console.log('✅ Conectado al chat de plataforma');
    });

    newSocket.on('new-message', (data: PlatformChatMessage) => {
      if (data.tenantId === selectedTenantId) {
        setMessages((prev) => [...prev, data]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedTenantId && socket) {
      // Unirse a la sala del tenant
      socket.emit('join-tenant-chat', { tenantId: selectedTenantId });
      loadChatHistory(selectedTenantId);
    }

    return () => {
      if (selectedTenantId && socket) {
        socket.emit('leave-tenant-chat', { tenantId: selectedTenantId });
      }
    };
  }, [selectedTenantId, socket]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await listActiveChatConversations();
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async (tenantId: string) => {
    try {
      const response = await getChatHistory(tenantId, 100);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedTenantId) return;

    try {
      const response = await sendChatMessage(selectedTenantId, message.trim());
      if (response.success) {
        setMessage('');
        // El mensaje se agregará automáticamente vía WebSocket
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  const selectedConversation = conversations.find((c) => c.tenant.id === selectedTenantId);

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* Lista de conversaciones */}
      <div className="w-80 border-r">
        <Card className="h-full border-0">
          <CardHeader>
            <CardTitle>{t('chat.conversations.title')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center">
                <p>{t('common.loading', { ns: 'common' })}</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('chat.conversations.no_conversations')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <button
                    key={conv.tenant.id}
                    onClick={() => setSelectedTenantId(conv.tenant.id)}
                    className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                      selectedTenantId === conv.tenant.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium">{conv.tenant.name}</div>
                    {conv.lastMessage && (
                      <div className="text-sm text-muted-foreground mt-1 truncate">
                        {conv.lastMessage.message}
                      </div>
                    )}
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="mt-2">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {selectedTenantId ? (
          <>
            <Card className="flex-1 flex flex-col border-0">
              <CardHeader className="border-b">
                <CardTitle>{selectedConversation?.tenant.name || t('chat.conversations.title')}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{msg.user.name || msg.user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('chat.messages.type_message')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center border-0">
            <CardContent className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('chat.conversations.no_conversations')}</p>
              <p className="text-sm text-muted-foreground mt-2">{t('chat.conversations.start_conversation')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
