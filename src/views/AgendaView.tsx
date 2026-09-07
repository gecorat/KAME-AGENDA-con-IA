import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Phone,
  Video,
  List,
  Columns3,
  CalendarDays,
  Sparkles,
  CheckCheck,
  Cloud,
  ListOrdered,
  X,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Info
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Appointment, AppointmentStatus } from '../types';

interface AgendaViewProps {
  onOpenNewAppointment: (date?: string, time?: string) => void;
  onEditAppointment: (apt: Appointment) => void;
  onNavigateToTab?: (tab: string) => void;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';

export const AgendaView: React.FC<AgendaViewProps> = ({
  onOpenNewAppointment,
  onEditAppointment,
  onNavigateToTab
}) => {
  const {
    appointments,
    services,
    waitlist,
    updateAppointment,
    deleteAppointment,
    hasExampleData,
    clearExampleData,
    isExampleItem
  } = useAgendaStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  // Default view is MONTHLY as requested
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Selected day for the right-side lateral sidebar/drawer
  const [selectedDayForDrawer, setSelectedDayForDrawer] = useState<string | null>(null);

  const waitingEntries = waitlist.filter(w => w.status === 'waiting');

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    if (viewMode === 'month') {
      setSelectedDayForDrawer(now.toISOString().split('T')[0]);
    }
  };

  const currentDateStr = currentDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // Week calculation (Monday to Saturday)
  const getWeekDays = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay(); // 0 is Sun, 1 is Mon
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(currentDate);

  // Month calculation (Monday to Sunday grid with padding)
  const getMonthDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: true
      });
    }

    // Next month padding to complete week rows
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      days.push({
        date: d,
        dateStr: d.toISOString().split('T')[0],
        isCurrentMonth: false
      });
    }

    return days;
  };

  const monthDays = getMonthDays(currentDate);

  // Helper formatting for header
  const formattedDateTitle = viewMode === 'month'
    ? currentDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : viewMode === 'week'
    ? `Semana del ${weekDays[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} al ${weekDays[weekDays.length - 1].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Filtered appointments
  const filteredAppointments = appointments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && a.service_id !== serviceFilter) return false;
    return true;
  });

  // Hours for daily grid: 08:00 to 20:00
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

  // Day view appointments
  const dayAppointments = filteredAppointments.filter(a =>
    a.start_datetime.startsWith(currentDateStr)
  );

  // Appointments for the day selected in the right sidebar
  const drawerDayAppointments = selectedDayForDrawer
    ? filteredAppointments
        .filter(a => a.start_datetime.startsWith(selectedDayForDrawer))
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    : [];

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return 'border-l-4 border-l-emerald-500 bg-emerald-50/70 text-emerald-950 border-emerald-200';
      case 'pending':
        return 'border-l-4 border-l-amber-500 bg-amber-50/70 text-amber-950 border-amber-200';
      case 'completed':
        return 'border-l-4 border-l-sky-500 bg-sky-50/70 text-sky-950 border-sky-200';
      case 'cancelled':
        return 'border-l-4 border-l-rose-400 bg-rose-50/60 text-rose-800 border-rose-200 line-through opacity-70';
      default:
        return 'border-l-4 border-l-neutral-400 bg-neutral-50 text-neutral-800';
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Confirmado</span>;
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pendiente</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">Atendido</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 line-through">Cancelado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-neutral-200/75 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center justify-between w-full md:w-auto gap-2 flex-wrap">
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/70 shrink-0">
            <button
              onClick={handlePrev}
              className="p-1 rounded-md hover:bg-white text-neutral-600 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:bg-white rounded-md transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-md hover:bg-white text-neutral-600 transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-semibold text-neutral-900 capitalize font-display ml-1">
            {formattedDateTitle}
          </h2>
        </div>

        {/* View Mode Switcher + Add button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/70 text-xs overflow-x-auto">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                viewMode === 'month'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                viewMode === 'week'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" /> Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                viewMode === 'day'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Día
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                viewMode === 'list'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onOpenNewAppointment(selectedDayForDrawer || currentDateStr, '10:00')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Turno</span>
            </button>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('google-sync')}
                className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                title="Sincronizar con Google Calendar y Sheets"
              >
                <Cloud className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Google Sync</span>
              </button>
            )}

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('espera')}
                className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                title="Abrir Lista de Espera Inteligente"
              >
                <ListOrdered className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Espera</span>
                {waitingEntries.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 text-neutral-800 font-semibold border border-neutral-200">
                    {waitingEntries.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demo / Example Data Banner with 1-click removal */}
      {hasExampleData && (
        <div className="bg-sky-50 border border-sky-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Info className="w-4 h-4 text-sky-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-900">
                Turnos de Demostración Activos
              </p>
              <p className="text-[11px] text-sky-800/90 leading-tight mt-0.5">
                La agenda muestra turnos de ejemplo para que explores el calendario. Se limpiarán al agendar tu primer turno real o puedes eliminarlos ahora.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearExampleData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
            title="Eliminar todos los registros de ejemplo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar datos de ejemplo</span>
          </button>
        </div>
      )}

      {/* Smart Cancellation Recovery Banner */}
      {filteredAppointments.some(a => a.status === 'cancelled') && waitingEntries.length > 0 && (
        <div className="bg-white border border-neutral-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Se detectaron huecos por cancelación en esta fecha
              </p>
              <p className="text-[11px] text-neutral-500">
                Tienes {waitingEntries.length} pacientes en Lista de Espera disponibles para asignación inmediata.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('espera')}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors shrink-0"
            >
              Ofrecer a lista de espera
            </button>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-neutral-500 font-medium flex items-center gap-1">
          Filtros:
        </span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-hidden"
        >
          <option value="all">Todos los estados</option>
          <option value="confirmed">Confirmados</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Atendidos</option>
          <option value="cancelled">Cancelados</option>
        </select>

        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value)}
          className="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-700 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-hidden"
        >
          <option value="all">Todos los servicios</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="ml-auto text-neutral-400 text-[11px]">
          {filteredAppointments.length} turnos registrados
        </div>
      </div>

      {/* VIEW 1: MONTH VIEW (DEFAULT) */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-neutral-200/80 bg-neutral-50/80 text-center text-xs font-bold text-neutral-600 py-2.5">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span className="text-neutral-400">Dom</span>
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100">
            {monthDays.map(dayItem => {
              const dayAppts = filteredAppointments.filter(a => a.start_datetime.startsWith(dayItem.dateStr));
              const isToday = dayItem.dateStr === todayStr;
              const isSelected = selectedDayForDrawer === dayItem.dateStr;

              return (
                <div
                  key={dayItem.dateStr}
                  onClick={() => setSelectedDayForDrawer(dayItem.dateStr)}
                  className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-neutral-50/80 group relative ${
                    !dayItem.isCurrentMonth ? 'bg-neutral-50/40 text-neutral-400' : 'bg-white text-neutral-900'
                  } ${isSelected ? 'ring-2 ring-inset ring-neutral-900 bg-neutral-50/60' : ''}`}
                >
                  {/* Top Bar of Cell */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                        isToday
                          ? 'bg-neutral-900 text-white font-bold'
                          : isSelected
                          ? 'bg-neutral-200 text-neutral-900 font-bold'
                          : 'text-neutral-700 group-hover:text-neutral-950'
                      }`}
                    >
                      {dayItem.date.getDate()}
                    </span>

                    {dayAppts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/60">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointments Preview inside Month Cell */}
                  <div className="space-y-1 my-1.5 flex-1 overflow-hidden">
                    {dayAppts.slice(0, 3).map(apt => {
                      const timeStr = new Date(apt.start_datetime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      let dotColor = 'bg-neutral-400';
                      if (apt.status === 'confirmed') dotColor = 'bg-emerald-500';
                      else if (apt.status === 'pending') dotColor = 'bg-amber-500';
                      else if (apt.status === 'completed') dotColor = 'bg-sky-500';
                      else if (apt.status === 'cancelled') dotColor = 'bg-rose-400';

                      return (
                        <div
                          key={apt.id}
                          className="px-1.5 py-0.5 rounded bg-neutral-100/90 text-[10px] text-neutral-800 flex items-center gap-1 truncate border border-neutral-200/60 hover:bg-neutral-200 transition-colors"
                          title={`${timeStr} - ${apt.patient_name} (${apt.service_name})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                          <span className="font-mono font-semibold text-[9px] shrink-0">{timeStr}</span>
                          <span className="truncate">{apt.patient_name}</span>
                        </div>
                      );
                    })}

                    {dayAppts.length > 3 && (
                      <div className="text-[9px] font-semibold text-neutral-500 pl-1">
                        +{dayAppts.length - 3} más...
                      </div>
                    )}
                  </div>

                  {/* Cell Bottom Hover Hint */}
                  <div className="opacity-0 group-hover:opacity-100 text-[10px] text-neutral-400 font-medium flex items-center justify-between transition-opacity pt-0.5 border-t border-neutral-100">
                    <span>Ver turnos</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-6 divide-x divide-neutral-200">
            {weekDays.map(day => {
              const dayStr = day.toISOString().split('T')[0];
              const isToday = dayStr === todayStr;
              const dayAppts = filteredAppointments.filter(a => a.start_datetime.startsWith(dayStr));

              return (
                <div
                  key={dayStr}
                  onClick={() => setSelectedDayForDrawer(dayStr)}
                  className="flex flex-col min-h-[450px] cursor-pointer hover:bg-neutral-50/50 transition-colors"
                >
                  {/* Day Header */}
                  <div className={`p-3 text-center border-b border-neutral-200 ${isToday ? 'bg-sky-50' : 'bg-neutral-50'}`}>
                    <span className="block text-xs font-medium text-neutral-500 uppercase">
                      {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                    </span>
                    <span className={`inline-block text-sm font-bold mt-0.5 ${isToday ? 'w-6 h-6 rounded-full bg-sky-600 text-white leading-6 mx-auto' : 'text-neutral-900'}`}>
                      {day.getDate()}
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {dayAppts.length} turnos
                    </span>
                  </div>

                  {/* Day Appointments List */}
                  <div className="p-2 space-y-2 flex-1">
                    {dayAppts.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNewAppointment(dayStr, '10:00');
                          }}
                          className="text-[11px] text-neutral-400 hover:text-sky-600 p-2 text-center"
                        >
                          + Agendar
                        </button>
                      </div>
                    ) : (
                      dayAppts.map(apt => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(apt);
                          }}
                          className={`p-2 rounded-lg border text-[11px] cursor-pointer shadow-2xs ${getStatusColor(apt.status)}`}
                        >
                          <div className="font-semibold truncate">{apt.patient_name}</div>
                          <div className="text-[10px] opacity-80 flex items-center justify-between mt-0.5">
                            <span>{new Date(apt.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="truncate ml-1">{apt.service_name}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: DAY VIEW */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {HOURS.map(hour => {
              const hourStr = `${hour.toString().padStart(2, '0')}:00`;

              const slotAppointments = dayAppointments.filter(a => {
                const aptHour = new Date(a.start_datetime).getHours();
                return aptHour === hour;
              });

              return (
                <div key={hour} className="flex min-h-[72px] group hover:bg-neutral-50/50 transition-colors">
                  <div className="w-20 sm:w-24 p-3 text-right text-xs font-semibold text-neutral-500 border-r border-neutral-100 shrink-0 select-none">
                    {hourStr}
                  </div>

                  <div className="flex-1 p-2 relative flex flex-col justify-center gap-2">
                    {slotAppointments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slotAppointments.map(apt => (
                          <div
                            key={apt.id}
                            onClick={() => onEditAppointment(apt)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs transition-all hover:scale-[1.01] ${getStatusColor(apt.status)}`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="truncate flex items-center gap-1">
                                {apt.patient_name}
                                {apt.patient_confirmed && (
                                  <CheckCheck className="w-3 h-3 text-emerald-600 shrink-0" title="Confirmado por paciente" />
                                )}
                              </span>
                              <span className="text-[11px] font-mono">
                                {new Date(apt.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[11px] opacity-90 mt-0.5 flex items-center justify-between">
                              <span className="truncate">{apt.service_name}</span>
                              <span className="font-medium">${apt.service_price?.toLocaleString()}</span>
                            </div>
                            {apt.origin === 'telemedicine' && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-700">
                                <Video className="w-3 h-3" /> Telemedicina
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenNewAppointment(currentDateStr, hourStr)}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-sky-600 text-xs font-medium py-1 px-2 rounded-lg hover:bg-sky-50 self-start transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agendar a las {hourStr}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 font-semibold text-xs text-neutral-700 uppercase tracking-wider">
            Listado Cronológico de Turnos
          </div>
          <div className="divide-y divide-neutral-100">
            {filteredAppointments.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">
                No hay turnos que coincidan con los filtros seleccionados.
              </div>
            ) : (
              filteredAppointments
                .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
                .map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => onEditAppointment(apt)}
                    className="p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-center shrink-0">
                        <span className="block text-xs font-bold text-neutral-900">
                          {new Date(apt.start_datetime).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="block text-[11px] text-neutral-500 font-mono">
                          {new Date(apt.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900">{apt.patient_name}</span>
                          <span className="text-xs text-neutral-500">({apt.patient_phone})</span>
                          {apt.patient_confirmed && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" /> Confirmado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {apt.service_name} • ${apt.service_price?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExampleItem(apt) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-300">
                          Ejemplo
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Deseas eliminar el turno de ${apt.patient_name}?`)) {
                            deleteAppointment(apt.id);
                          }
                        }}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                        title="Eliminar turno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RIGHT SIDEBAR / DRAWER: Turnos del día al hacer clic en cualquier fecha  */}
      {/* ========================================================================= */}
      {selectedDayForDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setSelectedDayForDrawer(null)}
          />

          {/* Lateral Slide-Over Panel from the Right */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            <div className="w-screen max-w-full sm:max-w-md bg-white border-l border-neutral-200/90 shadow-2xl flex flex-col transform transition-transform ease-in-out duration-300 animate-in slide-in-from-right">
              {/* Drawer Top Header */}
              <div className="p-4 border-b border-neutral-200/80 bg-neutral-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 capitalize font-display">
                      {new Date(selectedDayForDrawer + 'T00:00:00').toLocaleDateString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-500 font-medium">
                        {drawerDayAppointments.length} {drawerDayAppointments.length === 1 ? 'turno' : 'turnos'} agendados
                      </span>
                      {selectedDayForDrawer === todayStr && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-100 text-sky-800 font-bold">
                          HOY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDayForDrawer(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  title="Cerrar panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-3 border-b border-neutral-100 flex items-center justify-between gap-2 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    onOpenNewAppointment(selectedDayForDrawer, '10:00');
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Turno en este día</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentDate(new Date(selectedDayForDrawer + 'T00:00:00'));
                    setViewMode('day');
                    setSelectedDayForDrawer(null);
                  }}
                  className="px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors shrink-0"
                  title="Abrir vista diaria completa"
                >
                  Vista Día
                </button>
              </div>

              {/* Drawer Scrollable Content: Appointments of this day */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {drawerDayAppointments.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-neutral-800">
                      No hay turnos programados
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                      Este día se encuentra totalmente libre para coordinar consultas o descansos.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenNewAppointment(selectedDayForDrawer, '10:00')}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-2xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar primer turno</span>
                    </button>
                  </div>
                ) : (
                  drawerDayAppointments.map(apt => {
                    const timeStr = new Date(apt.start_datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const endTimeStr = new Date(apt.end_datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={apt.id}
                        className="p-3.5 rounded-2xl border border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-xs transition-all space-y-2.5"
                      >
                        {/* Appointment Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-mono text-xs font-bold text-neutral-800">
                              {timeStr} - {endTimeStr} hs
                            </span>
                            {getStatusBadge(apt.status)}
                          </div>

                          <span className="text-xs font-bold text-neutral-900">
                            ${apt.service_price?.toLocaleString()}
                          </span>
                        </div>

                        {/* Patient & Service Details */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-neutral-900 hover:underline cursor-pointer"
                              onClick={() => onEditAppointment(apt)}
                            >
                              {apt.patient_name}
                            </h4>
                            {apt.patient_confirmed && (
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                                <CheckCheck className="w-3 h-3" /> Paciente confirmó
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-700">{apt.service_name}</span>
                            {apt.origin === 'telemedicine' && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Video className="w-3 h-3" /> Telemedicina
                              </span>
                            )}
                          </div>

                          {apt.patient_phone && (
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-600">
                              <span className="font-mono">{apt.patient_phone}</span>
                              <a
                                href={`https://wa.me/${apt.patient_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" /> WhatsApp
                              </a>
                            </div>
                          )}

                          {apt.notes && (
                            <p className="text-[11px] text-neutral-500 italic bg-neutral-50 p-2 rounded-lg mt-2 border border-neutral-100">
                              "{apt.notes}"
                            </p>
                          )}
                        </div>

                        {/* Card Action Buttons (Open, Edit, Change Status) */}
                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1">
                            {/* Quick status change buttons */}
                            {apt.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { status: 'completed' })}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                                title="Marcar como atendido"
                              >
                                Atendido
                              </button>
                            )}

                            {apt.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { status: 'confirmed' })}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title="Confirmar turno"
                              >
                                Confirmar
                              </button>
                            )}

                            {apt.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => updateAppointment(apt.id, { status: 'cancelled' })}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Cancelar turno"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Open full editor modal */}
                            <button
                              type="button"
                              onClick={() => onEditAppointment(apt)}
                              className="px-2.5 py-1 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Abrir / Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Deseas eliminar el turno de ${apt.patient_name}?`)) {
                                  deleteAppointment(apt.id);
                                }
                              }}
                              className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar turno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Bottom Bar */}
              <div className="p-3 border-t border-neutral-200/80 bg-neutral-50/70 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedDayForDrawer(null)}
                  className="px-4 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
