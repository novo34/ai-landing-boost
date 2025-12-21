import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api/client';

// Función para obtener la URL base de la API (similar a la del cliente API)
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  const hostname = window.location.hostname;
  const port = '3001';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }

  const localIpPattern = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/;
  if (localIpPattern.test(hostname)) {
    return `http://${hostname}:${port}`;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  return `http://localhost:${port}`;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data.notifications || []);
        const unread = (response.data.notifications || []).filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      // Solo loguear si no es rate limiting (ya se maneja en el cliente)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('429') && !errorMessage.includes('rate_limit')) {
        console.error('Error loading notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.getUnreadNotificationCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      // Solo loguear si no es rate limiting
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('429') && !errorMessage.includes('rate_limit')) {
        console.error('Error loading unread count:', error);
      }
    }
  }, []);

  // Cargar notificaciones solo una vez
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    // Cargar notificaciones iniciales con un delay para evitar conflictos
    // Cargar primero el contador (más rápido) y luego las notificaciones completas
    const loadData = async () => {
      // Esperar un poco para que otros requests críticos terminen
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Cargar primero el contador (más rápido y menos datos)
      await loadUnreadCount();
      
      // Cargar notificaciones completas después con un pequeño delay
      // para evitar bloquear el main thread
      setTimeout(() => {
        loadNotifications();
      }, 500);
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias para que solo se ejecute una vez

  // Conectar WebSocket solo una vez
  useEffect(() => {
    // Evitar múltiples conexiones simultáneas (React Strict Mode)
    if (isConnectingRef.current || socketRef.current?.connected) {
      return undefined;
    }

    isConnectingRef.current = true;
    
    const connectWebSocket = async () => {
      // Esperar un poco para que otras verificaciones de auth terminen
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar nuevamente después del delay
      if (socketRef.current?.connected) {
        isConnectingRef.current = false;
        return;
      }
      
      // Verificar que el usuario esté autenticado usando AuthManager
      const { AuthManager } = await import('@/lib/auth');
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      
      if (!state.isAuthenticated) {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.warn('No token found, skipping WebSocket connection');
        }
        isConnectingRef.current = false;
        return;
      }

        // Si ya hay un socket conectado, no crear otro
      if (socketRef.current?.connected) {
        isConnectingRef.current = false;
        return;
      }
      
      // Si hay un socket pero no está conectado, esperar un poco antes de cerrarlo
      // para evitar cerrar una conexión que se está estableciendo
      if (socketRef.current && !socketRef.current.connected) {
        // Esperar un poco para ver si se conecta
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Si después del delay sigue desconectado, cerrarlo
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
        } else if (socketRef.current?.connected) {
          // Se conectó mientras esperábamos, no crear otro
          isConnectingRef.current = false;
          return;
        }
      }

      // Referencias:
      // - Socket.IO client options: https://socket.io/docs/v4/client-options/
      // - withCredentials: https://socket.io/docs/v4/client-options/#withcredentials
      // - HttpOnly cookies: https://socket.io/how-to/deal-with-cookies
      
      const apiUrl = getApiBaseUrl();
      
      // Validar URL antes de conectar
      try {
        const url = new URL(apiUrl);
        // Si es una URL de ngrok (wss:// o https:// con dominio ngrok), verificar disponibilidad
        if (url.hostname.includes('ngrok') && url.protocol === 'https:') {
          // Para ngrok, usar wss:// en lugar de ws://
          // Socket.IO manejará esto automáticamente, pero validamos la URL
        }
      } catch {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.error('❌ URL de API inválida para WebSocket:', apiUrl);
        }
        isConnectingRef.current = false;
        return;
      }

      // Configurar manejo de errores silencioso para WebSocket cuando no está en modo debug
      // Socket.IO muestra errores en consola antes de que podamos manejarlos
      const shouldSilenceErrors = process.env.NEXT_PUBLIC_DEBUG_API !== 'true';
      let errorInterceptor: ((...args: any[]) => void) | null = null;
      let originalError: typeof console.error | null = null;
      
      if (shouldSilenceErrors) {
        originalError = console.error.bind(console);
        errorInterceptor = (...args: any[]) => {
          // Solo silenciar errores específicos de WebSocket que son esperados cuando el backend no está disponible
          const errorMessage = String(args[0] || '');
          const isWebSocketError = 
            errorMessage.includes('WebSocket') &&
            (errorMessage.includes('failed') ||
             errorMessage.includes('closed before the connection is established') ||
             errorMessage.includes('ERR_CONNECTION_REFUSED') ||
             errorMessage.includes('ngrok') ||
             errorMessage.includes('socket.io'));
          
          if (!isWebSocketError && originalError) {
            // No es un error de WebSocket, mostrar normalmente
            originalError.apply(console, args);
          }
          // Si es un error de WebSocket, silenciarlo (es esperado cuando el backend no está disponible)
        };
        console.error = errorInterceptor;
      }

      // Conectar a WebSocket
      // Socket.IO enviará las cookies HttpOnly automáticamente con withCredentials
      // El namespace /notifications está configurado en el backend
      const newSocket = io(`${apiUrl}/notifications`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000, // Aumentado para evitar reconexiones rápidas
        reconnectionAttempts: 3, // Reducido para evitar spam de errores cuando ngrok no está disponible
        reconnectionDelayMax: 10000, // Máximo 10 segundos entre reconexiones
        withCredentials: true, // Enviar cookies HttpOnly automáticamente
        autoConnect: true,
        timeout: 20000, // Timeout de conexión de 20 segundos (aumentado)
        forceNew: false, // Reutilizar conexiones existentes
        // Evitar que se cierre automáticamente
        closeOnBeforeunload: false,
      });

      // Restaurar console.error después de configurar el socket
      if (shouldSilenceErrors && errorInterceptor && originalError) {
        setTimeout(() => {
          // Solo restaurar si todavía está nuestro interceptor
          if (console.error === errorInterceptor) {
            console.error = originalError;
          }
        }, 2000);
      }

      newSocket.on('connect', () => {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('✅ Connected to notifications WebSocket');
        }
        isConnectingRef.current = false;
        // Marcar como conectado para evitar reconexiones innecesarias
        socketRef.current = newSocket;
        setSocket(newSocket);
      });

      newSocket.on('disconnect', (reason) => {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('Disconnected from notifications WebSocket:', reason);
        }
        // Solo reconectar si no fue un cierre intencional
        if (reason === 'io server disconnect') {
          // El servidor desconectó el socket, no reconectar
          isConnectingRef.current = false;
        } else if (reason === 'io client disconnect') {
          // Cliente desconectó intencionalmente, no reconectar
          isConnectingRef.current = false;
        }
        // Para otros casos (transport close, ping timeout), Socket.IO se reconectará automáticamente
      });

      newSocket.on('connect_error', (error: Error) => {
        // Manejar errores de conexión gracefully
        // No intentar reconectar agresivamente si el backend está caído
        const errorMessage = error.message || String(error);
        const isExpectedError = 
          errorMessage.includes('xhr poll error') ||
          errorMessage.includes('websocket error') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('ngrok') ||
          errorMessage.includes('closed before the connection is established') ||
          errorMessage.includes('timeout');
        
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && !isExpectedError) {
          console.error('WebSocket connection error:', error);
        } else if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && isExpectedError) {
            console.warn('💡 Backend puede no estar disponible. Verifica que esté corriendo en', apiUrl);
        }
        // No reconectar si es un error esperado (backend no disponible)
        if (isExpectedError) {
          // No desconectar inmediatamente, dejar que Socket.IO maneje la reconexión
          // Solo marcar como no conectando para permitir reintentos
          isConnectingRef.current = false;
        }
      });

      newSocket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      newSocket.on('notification_read', (data: { notificationId: string }) => {
        setNotifications(prev =>
          prev.map(n => (n.id === data.notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });

      // Guardar referencia solo si no hay otra conexión activa
      if (!socketRef.current?.connected) {
      socketRef.current = newSocket;
      setSocket(newSocket);
      }
      // No marcar isConnectingRef como false aquí, se hará en los handlers de connect/error
    };

    connectWebSocket();

    return () => {
      // Solo cerrar el socket si el componente se desmonta realmente
      // No cerrar si es solo React Strict Mode ejecutando el efecto dos veces
      // Esperar un poco antes de cerrar para evitar cerrar una conexión que se está estableciendo
      let timeoutId: NodeJS.Timeout | null = null;
      
      timeoutId = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
      isConnectingRef.current = false;
      }, 100);
      
      // Cleanup: limpiar timeout si el componente se desmonta antes
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Sin dependencias para que solo se ejecute una vez

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await apiClient.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Actualizar contador si la notificación no estaba leída
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}
