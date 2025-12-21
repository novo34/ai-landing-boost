'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, getWeek, startOfDay, isToday, parseISO, differenceInMinutes } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Appointment {
  id: string;
  agentId: string;
  participantName?: string;
  participantPhone: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  agent?: {
    id: string;
    name: string;
  };
}

type ViewMode = 'month' | 'week' | 'day';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
  COMPLETED: 'bg-gray-500',
  NO_SHOW: 'bg-orange-500',
};

export function CalendarView() {
  const { toast } = useToast();
  const { t, locale } = useTranslation('common');
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: Date; hour?: number } | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{ appointment: Appointment; newStartTime: Date; newEndTime: Date } | null>(null);

  const dateLocale = locale === 'es' ? es : enUS;

  // Cargar agentes
  useEffect(() => {
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
    loadAgents();
  }, []);

  // Cargar citas según el rango de la vista actual
  const loadAppointments = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const response = await apiClient.getAppointmentsByRange(
        start.toISOString(),
        end.toISOString(),
        selectedAgentId !== 'all' ? selectedAgentId : undefined,
      );
      if (response.success && response.data) {
        setAppointments(response.data);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: t('errors.generic'),
        description: t('appointments.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId, toast, t]);

  // Calcular rango según vista
  const getDateRange = useCallback((date: Date, mode: ViewMode) => {
    switch (mode) {
      case 'month': {
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        return { start: startOfWeek(start, { locale: dateLocale }), end: endOfWeek(end, { locale: dateLocale }) };
      }
      case 'week': {
        const start = startOfWeek(date, { locale: dateLocale });
        const end = endOfWeek(date, { locale: dateLocale });
        return { start, end };
      }
      case 'day': {
        const start = startOfDay(date);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
    }
  }, [dateLocale]);

  // Cargar citas cuando cambia la fecha o el modo de vista
  useEffect(() => {
    const range = getDateRange(currentDate, viewMode);
    loadAppointments(range.start, range.end);
  }, [currentDate, viewMode, loadAppointments, getDateRange]);

  // Cargar citas cuando cambia el filtro de agente
  useEffect(() => {
    const range = getDateRange(currentDate, viewMode);
    loadAppointments(range.start, range.end);
  }, [selectedAgentId]);

  const handlePrevious = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    router.push(`/app/appointments/${appointment.id}`);
  };

  // Manejar inicio de drag
  const handleDragStart = (appointment: Appointment) => {
    setDraggedAppointment(appointment);
  };

  // Manejar drag sobre un drop zone
  const handleDragOver = (date: Date, hour?: number) => {
    if (draggedAppointment) {
      setDropTarget({ date, hour });
    }
  };

  // Manejar fin de drag
  const handleDragEnd = (appointment: Appointment, targetDate: Date, targetHour?: number) => {
    if (!draggedAppointment || draggedAppointment.id !== appointment.id) return;

    const originalStart = parseISO(appointment.startTime);
    const originalEnd = parseISO(appointment.endTime);
    const duration = differenceInMinutes(originalEnd, originalStart);

    // Calcular nueva fecha/hora
    let newStartTime: Date;
    if (viewMode === 'month') {
      // En vista mensual, mantener la hora original pero cambiar el día
      newStartTime = new Date(targetDate);
      newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    } else if (viewMode === 'week' || viewMode === 'day') {
      // En vista semanal/diaria, usar la hora del drop target
      newStartTime = new Date(targetDate);
      if (targetHour !== undefined) {
        newStartTime.setHours(targetHour, 0, 0, 0);
      } else {
        newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
      }
    } else {
      newStartTime = originalStart;
    }

    // Validar que no esté en el pasado
    if (newStartTime < new Date()) {
      toast({
        title: t('errors.generic'),
        description: t('appointments.cannot_reschedule_past'),
        variant: 'destructive',
      });
      setDraggedAppointment(null);
      setDropTarget(null);
      return;
    }

    const newEndTime = new Date(newStartTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + duration);

    // Mostrar diálogo de confirmación
    setRescheduleData({
      appointment,
      newStartTime,
      newEndTime,
    });
    setShowRescheduleDialog(true);
    setDraggedAppointment(null);
    setDropTarget(null);
  };

  // Confirmar reprogramación
  const handleConfirmReschedule = async () => {
    if (!rescheduleData) return;

    try {
      setLoading(true);
      await apiClient.rescheduleAppointment(rescheduleData.appointment.id, {
        startTime: rescheduleData.newStartTime.toISOString(),
        endTime: rescheduleData.newEndTime.toISOString(),
      });

      toast({
        title: t('appointments.reschedule_success'),
        description: t('appointments.reschedule_success_description'),
      });

      // Recargar citas
      const range = getDateRange(currentDate, viewMode);
      await loadAppointments(range.start, range.end);
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: t('errors.generic'),
        description: t('appointments.reschedule_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowRescheduleDialog(false);
      setRescheduleData(null);
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.startTime);
      return isSameDay(aptDate, date);
    });
  };

  // Vista mensual
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: dateLocale });
    const calendarEnd = endOfWeek(monthEnd, { locale: dateLocale });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    if (locale === 'en') {
      weekDays[0] = 'S'; weekDays[1] = 'M'; weekDays[2] = 'T'; weekDays[3] = 'W';
      weekDays[4] = 'T'; weekDays[5] = 'F'; weekDays[6] = 'S';
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, idx) => (
            <div key={idx} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            const isDropTargetDay = dropTarget && isSameDay(day, dropTarget.date) && !dropTarget.hour;

            return (
              <Card
                key={idx}
                className={`p-2 min-h-[100px] cursor-pointer hover:bg-accent transition-colors ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isCurrentDay ? 'ring-2 ring-primary' : ''} ${
                  isDropTargetDay ? 'bg-primary/10 ring-2 ring-primary' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedAppointment) {
                    handleDragOver(day);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedAppointment) {
                    handleDragEnd(draggedAppointment, day);
                  }
                }}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      draggable
                      onDragStart={() => handleDragStart(apt)}
                      onDragEnd={() => {
                        handleDragEnd(apt, day);
                        setDraggedAppointment(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(day);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDragEnd(apt, day);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppointmentClick(apt);
                      }}
                      className={`text-xs p-1 rounded truncate cursor-move hover:opacity-80 transition-opacity ${statusColors[apt.status] || 'bg-gray-500'} text-white ${
                        draggedAppointment?.id === apt.id ? 'opacity-50' : ''
                      }`}
                      title={`${apt.participantName || apt.participantPhone} - ${format(parseISO(apt.startTime), 'HH:mm')}`}
                    >
                      {format(parseISO(apt.startTime), 'HH:mm')} {apt.participantName || apt.participantPhone}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayAppointments.length - 3} {t('appointments.more')}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Vista semanal
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: dateLocale });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { locale: dateLocale }),
    });

    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-8 gap-2 border-b pb-2">
          <div className="text-sm font-medium text-muted-foreground">Hora</div>
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center">
              <div className="text-sm font-medium">
                {format(day, 'EEE', { locale: dateLocale })}
              </div>
              <div className={`text-xs ${isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {format(day, 'd MMM', { locale: dateLocale })}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-2">
              <div className="text-xs text-muted-foreground py-2">
                {hour}:00
              </div>
              {weekDays.map((day, dayIdx) => {
                const dayAppointments = getAppointmentsForDate(day).filter(apt => {
                  const aptHour = parseISO(apt.startTime).getHours();
                  return aptHour === hour || (aptHour < hour && parseISO(apt.endTime).getHours() > hour);
                });

                const isDropTarget = dropTarget && isSameDay(day, dropTarget.date) && dropTarget.hour === hour;

                return (
                  <div
                    key={dayIdx}
                    className={`border-r border-b min-h-[60px] p-1 ${
                      isDropTarget ? 'bg-primary/10 ring-2 ring-primary' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(day, hour);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedAppointment) {
                        handleDragEnd(draggedAppointment, day, hour);
                      }
                    }}
                  >
                    {dayAppointments.map(apt => {
                      const start = parseISO(apt.startTime);
                      const end = parseISO(apt.endTime);
                      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutos
                      const height = Math.max(30, (duration / 60) * 60); // altura proporcional

                      return (
                        <div
                          key={apt.id}
                          draggable
                          onDragStart={() => handleDragStart(apt)}
                          onDragEnd={() => {
                            setDraggedAppointment(null);
                            setDropTarget(null);
                          }}
                          onClick={() => handleAppointmentClick(apt)}
                          className={`${statusColors[apt.status] || 'bg-gray-500'} text-white text-xs p-1 rounded mb-1 cursor-move hover:opacity-80 transition-opacity ${
                            draggedAppointment?.id === apt.id ? 'opacity-50' : ''
                          }`}
                          style={{ height: `${height}px` }}
                          title={`${apt.participantName || apt.participantPhone} - ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`}
                        >
                          <div className="font-medium truncate">
                            {apt.participantName || apt.participantPhone}
                          </div>
                          <div className="text-[10px] opacity-90">
                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Vista diaria
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate).sort((a, b) => {
      return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
    });

    return (
      <div className="space-y-4">
        <div className="text-lg font-semibold">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : dayAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('appointments.no_appointments')}
          </div>
        ) : (
          <div className="space-y-2">
            {dayAppointments.map(apt => {
              const start = parseISO(apt.startTime);
              const end = parseISO(apt.endTime);

              return (
                <Card
                  key={apt.id}
                  draggable
                  onDragStart={() => handleDragStart(apt)}
                  onDragEnd={() => {
                    if (dropTarget && isSameDay(currentDate, dropTarget.date)) {
                      handleDragEnd(apt, currentDate, dropTarget.hour);
                    }
                    setDraggedAppointment(null);
                    setDropTarget(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(currentDate, start.getHours());
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedAppointment && draggedAppointment.id !== apt.id) {
                      handleDragEnd(draggedAppointment, currentDate, start.getHours());
                    }
                  }}
                  className={`p-4 cursor-move hover:bg-accent transition-colors ${
                    draggedAppointment?.id === apt.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => handleAppointmentClick(apt)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={statusColors[apt.status] || 'bg-gray-500'}>
                          {t(`appointments.statuses.${apt.status}`)}
                        </Badge>
                        {apt.agent && (
                          <span className="text-sm text-muted-foreground">
                            {apt.agent.name}
                          </span>
                        )}
                      </div>
                      <div className="font-medium">
                        {apt.participantName || apt.participantPhone}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(start, 'HH:mm', { locale: dateLocale })} - {format(end, 'HH:mm', { locale: dateLocale })}
                      </div>
                      {apt.notes && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {apt.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            {t('calendar.today')}
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold ml-4">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
            {viewMode === 'week' && `${format(startOfWeek(currentDate, { locale: dateLocale }), 'd MMM', { locale: dateLocale })} - ${format(endOfWeek(currentDate, { locale: dateLocale }), 'd MMM yyyy', { locale: dateLocale })}`}
            {viewMode === 'day' && format(currentDate, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('appointments.all_agents')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('appointments.all_agents')}</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">{t('calendar.month')}</TabsTrigger>
              <TabsTrigger value="week">{t('calendar.week')}</TabsTrigger>
              <TabsTrigger value="day">{t('calendar.day')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Vista del calendario */}
      <Card className="p-4">
        {loading && viewMode !== 'day' ? (
          <Skeleton className="h-[600px] w-full" />
        ) : (
          <>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </>
        )}
      </Card>

      {/* Diálogo de confirmación de reprogramación */}
      <AlertDialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('appointments.reschedule_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {rescheduleData && (
                <div className="space-y-2 mt-2">
                  <div>
                    <strong>{t('appointments.current_time')}:</strong>{' '}
                    {format(parseISO(rescheduleData.appointment.startTime), 'PPpp', { locale: dateLocale })}
                  </div>
                  <div>
                    <strong>{t('appointments.new_time')}:</strong>{' '}
                    {format(rescheduleData.newStartTime, 'PPpp', { locale: dateLocale })}
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReschedule} disabled={loading}>
              {loading ? t('loading') : t('appointments.confirm_reschedule')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
