import React, { useState } from 'react';
import {
  ListOrdered,
  Plus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  CalendarCheck,
  Clock,
  Flame,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { WaitlistEntry, WaitlistPriority, WaitlistStatus } from '../types';

interface WaitlistViewProps {
  onOpenNewWaitlist: () => void;
  onEditWaitlist: (entry: WaitlistEntry) => void;
  onScheduleFromWaitlist: (entry: WaitlistEntry) => void;
}

export const WaitlistView: React.FC<WaitlistViewProps> = ({
  onOpenNewWaitlist,
  onEditWaitlist,
  onScheduleFromWaitlist
}) => {
  const {
    waitlist,
    practiceSettings,
    deleteWaitlistEntry,
    updateWaitlistEntry,
    notifyWaitlistEntry
  } = useAgendaStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('waiting');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Stats
  const waitingCount = waitlist.filter(w => w.status === 'waiting').length;
  const urgentCount = waitlist.filter(w => w.status === 'waiting' && (w.priority === 'urgent' || w.priority === 'high')).length;
  const notifiedCount = waitlist.filter(w => w.status === 'notified').length;
  const scheduledCount = waitlist.filter(w => w.status === 'scheduled').length;

  // Filter list
  const filteredWaitlist = waitlist.filter(entry => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && entry.priority !== priorityFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = entry.patient_name.toLowerCase().includes(q);
      const matchPhone = entry.patient_phone.includes(q);
      const matchService = entry.service_name?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService) return false;
    }
    return true;
  });

  const handleNotifyWhatsApp = (entry: WaitlistEntry) => {
    notifyWaitlistEntry(entry.id);

    const cleanPhone = entry.patient_phone.replace(/\D/g, '');
    const serviceText = entry.service_name || 'tu consulta';
    const message = `¡Hola ${entry.patient_name}! 👋 Te escribimos del ${practiceSettings.practice_name}. Se acaba de liberar un espacio en la agenda para ${serviceText}. Como estabas en nuestra lista de espera con prioridad, te avisamos primero. ¿Te gustaría coordinar el turno? ¡Quedamos a tu disposición!`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');

    setNotificationToast(`Se preparó el aviso por WhatsApp para ${entry.patient_name}`);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  const getPriorityBadge = (priority: WaitlistPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
            Urgente
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Alta
          </span>
        );
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700">
            Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status: WaitlistStatus) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            En espera
          </span>
        );
      case 'notified':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Avisado
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Turno asignado
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-500">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast feedback */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              Lista de Espera Inteligente
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 font-bold">
                {waitingCount} activos
              </span>
            </h2>
            <p className="text-xs text-neutral-500">
              Cubre cancelaciones al instante avisando a pacientes en espera por WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={onOpenNewWaitlist}
          className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Anotar en Espera
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 block">En espera activa</span>
          <div className="text-2xl font-bold text-neutral-900 mt-0.5">{waitingCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Disponibles para huecos</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 block">Urgentes / Alta prioridad</span>
          <div className="text-2xl font-bold text-rose-600 mt-0.5">{urgentCount}</div>
          <span className="text-[10px] text-neutral-400">Atención prioritaria</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 block">Avisados recientemente</span>
          <div className="text-2xl font-bold text-purple-600 mt-0.5">{notifiedCount}</div>
          <span className="text-[10px] text-purple-600 font-medium">Esperando respuesta</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-medium text-neutral-500 block">Huecos recuperados</span>
          <div className="text-2xl font-bold text-emerald-600 mt-0.5">{scheduledCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Turnos concretados</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, teléfono o tratamiento..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200">
            <button
              onClick={() => setStatusFilter('waiting')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'waiting' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              En Espera ({waitingCount})
            </button>
            <button
              onClick={() => setStatusFilter('notified')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'notified' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Avisados ({notifiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'scheduled' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Concretados ({scheduledCount})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'all' ? 'bg-white text-neutral-900 font-bold shadow-2xs' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Todos
            </button>
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-700 font-medium focus:outline-none"
          >
            <option value="all">Toda prioridad</option>
            <option value="urgent">Solo Urgentes</option>
            <option value="high">Solo Alta</option>
            <option value="normal">Solo Normal</option>
          </select>
        </div>
      </div>

      {/* Waitlist Grid / Cards */}
      {filteredWaitlist.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ListOrdered className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1">No hay pacientes con estos filtros</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
            Anota pacientes cuando no tengas turnos disponibles para que reciban aviso en cuanto alguien cancele.
          </p>
          <button
            onClick={onOpenNewWaitlist}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Anotar Paciente en Espera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWaitlist.map(entry => {
            const timeAgoDays = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Priority & Status & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(entry.priority)}
                      {getStatusBadge(entry.status)}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditWaitlist(entry)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${entry.patient_name} de la lista de espera?`)) {
                            deleteWaitlistEntry(entry.id);
                          }
                        }}
                        className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                      {entry.patient_name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-neutral-400" />
                      {entry.patient_phone}
                    </div>
                  </div>

                  {/* Service */}
                  <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100 mb-3">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      Tratamiento Solicitado
                    </div>
                    <div className="text-xs font-bold text-neutral-800">
                      {entry.service_name || 'Consulta General'}
                    </div>
                  </div>

                  {/* Availability details */}
                  <div className="space-y-1.5 text-xs text-neutral-600 mb-3">
                    {entry.preferred_days && entry.preferred_days.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-neutral-400 font-medium">Días:</span>
                        {entry.preferred_days.map(day => (
                          <span
                            key={day}
                            className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-semibold"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-neutral-400 font-medium">Horario:</span>
                      <span className="text-neutral-700 text-[11px] font-medium">
                        {entry.preferred_time_range === 'morning' && 'Mañanas (08 a 13 hs)'}
                        {entry.preferred_time_range === 'afternoon' && 'Tardes (13 a 19 hs)'}
                        {(!entry.preferred_time_range || entry.preferred_time_range === 'any') && 'Cualquier horario'}
                      </span>
                    </div>

                    {entry.notes && (
                      <div className="text-[11px] text-neutral-500 bg-amber-50/60 p-2 rounded-xl border border-amber-100 mt-2 italic leading-snug">
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Anotado hace {timeAgoDays === 0 ? 'hoy' : `${timeAgoDays} días`}</span>
                    {entry.notified_at && (
                      <span className="text-purple-600 font-medium">
                        Avisado el {new Date(entry.notified_at).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Send WhatsApp notification */}
                    <button
                      onClick={() => handleNotifyWhatsApp(entry)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                      title="Abrir chat de WhatsApp para ofrecer turno"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      Avisar WA
                    </button>

                    {/* Schedule directly */}
                    <button
                      onClick={() => onScheduleFromWaitlist(entry)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      Asignar Turno
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
