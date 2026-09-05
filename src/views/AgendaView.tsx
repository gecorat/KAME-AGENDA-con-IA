import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Check,
  Clock,
  User,
  Phone,
  Video,
  List,
  Columns3,
  CalendarDays,
  ExternalLink,
  ListOrdered,
  Sparkles,
  AlertCircle,
  Bell,
  CheckCheck
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Appointment, AppointmentStatus } from '../types';

interface AgendaViewProps {
  onOpenNewAppointment: (date?: string, time?: string) => void;
  onEditAppointment: (apt: Appointment) => void;
  onNavigateToTab?: (tab: string) => void;
}

type ViewMode = 'day' | 'week' | 'list';

export const AgendaView: React.FC<AgendaViewProps> = ({
  onOpenNewAppointment,
  onEditAppointment,
  onNavigateToTab
}) => {
  const { appointments, services, waitlist, updateAppointment } = useAgendaStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const waitingEntries = waitlist.filter(w => w.status === 'waiting');

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const currentDateStr = currentDate.toISOString().split('T')[0];

  // Helper formatting
  const formattedDateTitle = currentDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Filtered appointments
  const filteredAppointments = appointments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && a.service_id !== serviceFilter) return false;
    return true;
  });

  // Hours for daily grid: 08:00 to 20:00
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 to 19

  // Day view appointments
  const dayAppointments = filteredAppointments.filter(a =>
    a.start_datetime.startsWith(currentDateStr)
  );

  // Week calculation
  const getWeekDays = (baseDate: Date) => {
    const current = new Date(baseDate);
    const day = current.getDay(); // 0 is Sun, 1 is Mon
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));

    return Array.from({ length: 6 }, (_, i) => { // Mon to Sat
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(currentDate);

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

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 rounded-xl p-0.5 border border-neutral-200">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-600 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-white rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-600 transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-semibold text-neutral-900 capitalize ml-2">
            {formattedDateTitle}
          </h2>
        </div>

        {/* View Mode Switcher + Add button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-neutral-100 rounded-xl p-1 border border-neutral-200 text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'day' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Día
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'week' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <Columns3 className="w-3.5 h-3.5" /> Semana
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          <button
            onClick={() => onOpenNewAppointment(currentDateStr, '10:00')}
            className="px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Turno
          </button>

          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('espera')}
              className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
              title="Abrir Lista de Espera Inteligente"
            >
              <ListOrdered className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Lista de Espera</span>
              {waitingEntries.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
                  {waitingEntries.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Smart Cancellation Recovery Banner */}
      {filteredAppointments.some(a => a.status === 'cancelled') && waitingEntries.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Se detectaron huecos por cancelación en esta fecha
              </p>
              <p className="text-[11px] text-amber-800">
                Tienes {waitingEntries.length} pacientes en Lista de Espera listos para tomar turnos liberados.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('espera')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              Ofrecer hueco a lista de espera
            </button>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs bg-white p-3 rounded-xl border border-neutral-200">
        <span className="text-neutral-500 font-medium flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar:
        </span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700"
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
          className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700"
        >
          <option value="all">Todos los servicios</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="ml-auto text-neutral-400 text-[11px]">
          {filteredAppointments.length} turnos registrados en total
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {HOURS.map(hour => {
              const hourStr = `${hour.toString().padStart(2, '0')}:00`;
              const nextHourStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
              
              // Find appointments starting in this hour slot
              const slotAppointments = dayAppointments.filter(a => {
                const aptHour = new Date(a.start_datetime).getHours();
                return aptHour === hour;
              });

              return (
                <div key={hour} className="flex min-h-[72px] group hover:bg-neutral-50/50 transition-colors">
                  {/* Hour label */}
                  <div className="w-20 sm:w-24 p-3 text-right text-xs font-semibold text-neutral-500 border-r border-neutral-100 shrink-0 select-none">
                    {hourStr}
                  </div>

                  {/* Slot content */}
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

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-x-auto">
          <div className="min-w-[700px] grid grid-cols-6 divide-x divide-neutral-200">
            {weekDays.map(day => {
              const dayStr = day.toISOString().split('T')[0];
              const isToday = dayStr === new Date().toISOString().split('T')[0];
              const dayAppts = filteredAppointments.filter(a => a.start_datetime.startsWith(dayStr));

              return (
                <div key={dayStr} className="flex flex-col min-h-[450px]">
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
                          onClick={() => onOpenNewAppointment(dayStr, '10:00')}
                          className="text-[11px] text-neutral-400 hover:text-sky-600 p-2 text-center"
                        >
                          + Agendar
                        </button>
                      </div>
                    ) : (
                      dayAppts.map(apt => (
                        <div
                          key={apt.id}
                          onClick={() => onEditAppointment(apt)}
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

      {/* List View */}
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
