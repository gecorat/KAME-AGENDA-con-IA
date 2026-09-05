import React from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Phone,
  Video,
  ChevronRight,
  ListOrdered,
  Bell,
  CheckCheck,
  Receipt
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Appointment } from '../types';

interface DashboardViewProps {
  onOpenNewAppointment: () => void;
  onNavigateToTab: (tab: string) => void;
  onEditAppointment: (apt: Appointment) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewAppointment,
  onNavigateToTab,
  onEditAppointment
}) => {
  const { appointments, patients, services, practiceSettings, waitlist, updateAppointment, payments } = useAgendaStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const waitingList = waitlist.filter(w => w.status === 'waiting');
  const monthCollected = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  // Appointments today
  const todayAppointments = appointments.filter(a => {
    return a.start_datetime.startsWith(todayStr);
  }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  // Calculations
  const totalCompleted = appointments.filter(a => a.status === 'completed').length;
  const totalConfirmed = appointments.filter(a => a.status === 'confirmed').length;
  const totalPending = appointments.filter(a => a.status === 'pending').length;
  const projectedRevenue = appointments
    .filter(a => a.status !== 'cancelled')
    .reduce((acc, curr) => acc + (curr.service_price || 0), 0);

  const formatHour = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmado</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Pendiente</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">Atendido</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Public Link Preview */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center font-semibold shadow-xs">
            {practiceSettings.professional_name.slice(3, 5).toUpperCase() || 'AP'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">{practiceSettings.practice_name}</h2>
              <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200 font-medium">
                {practiceSettings.specialty}
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
              <span>Link de reservas públicas:</span>
              <button
                onClick={() => onNavigateToTab('portal')}
                className="text-sky-600 hover:text-sky-700 font-medium inline-flex items-center gap-0.5 hover:underline"
              >
                agendapro.ai/u/{practiceSettings.handle}
                <ExternalLink className="w-3 h-3" />
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigateToTab('portal')}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver Portal de Reserva
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Turno
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Turnos de Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight">
            {todayAppointments.length}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {todayAppointments.filter(a => a.status === 'confirmed').length} confirmados • {todayAppointments.filter(a => a.status === 'completed').length} atendidos
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Pacientes Registrados</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight">
            {patients.length}
          </div>
          <p className="text-[11px] text-teal-600 font-medium mt-1">
            +3 pacientes nuevos esta semana
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab('cobros')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium group-hover:text-emerald-700 transition-colors">Cobrado en el Mes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 tracking-tight">
            ${monthCollected.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span>Ver caja & comprobantes</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Asistente IA WhatsApp</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700 tracking-tight flex items-center gap-2">
            <span>24/7</span>
            <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Activo</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Responde, verifica horarios y agenda
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Agenda + IA Assistant Quick Box */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Appointments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-neutral-900">Agenda para Hoy</h3>
                <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
                  {todayAppointments.length} turnos
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('agenda')}
                className="text-xs font-medium text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"
              >
                Ver calendario completo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm">No hay turnos registrados para hoy.</p>
                <button
                  onClick={onOpenNewAppointment}
                  className="mt-3 text-xs text-sky-600 font-medium hover:underline"
                >
                  + Agendar un turno ahora
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-center shrink-0 w-14 bg-white border border-neutral-200 rounded-lg p-1.5 shadow-2xs">
                        <span className="block text-xs font-bold text-neutral-900">{formatHour(apt.start_datetime)}</span>
                        <span className="block text-[10px] text-neutral-400">{formatHour(apt.end_datetime)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-neutral-900">{apt.patient_name}</span>
                          {getStatusBadge(apt.status)}
                          {apt.patient_confirmed && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                              <CheckCheck className="w-3 h-3 text-emerald-600" /> Confirmado
                            </span>
                          )}
                          {apt.origin === 'telemedicine' && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-medium">
                              <Video className="w-3 h-3" /> Online
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-neutral-600 font-medium">
                            {apt.service_name} • ${apt.service_price?.toLocaleString()}
                          </p>
                          {apt.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                              <Receipt className="w-2.5 h-2.5" /> Pagado
                            </span>
                          ) : (
                            <button
                              onClick={() => onNavigateToTab('cobros')}
                              className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200 font-semibold transition-colors"
                              title="Ir a registrar cobro"
                            >
                              <DollarSign className="w-2.5 h-2.5" /> Sin cobrar
                            </button>
                          )}
                        </div>
                        {apt.notes && (
                          <p className="text-[11px] text-neutral-400 mt-0.5 italic truncate max-w-sm">
                            "{apt.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <a
                        href={`https://wa.me/${apt.patient_phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {apt.status !== 'completed' && (
                        <button
                          onClick={() => updateAppointment(apt.id, { status: 'completed' })}
                          className="px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                          title="Marcar como atendido"
                        >
                          Atender
                        </button>
                      )}

                      <button
                        onClick={() => onEditAppointment(apt)}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg transition-colors"
                      >
                        Detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Zona horaria: América/Argentina/Buenos_Aires (GMT-3)</span>
            <button
              onClick={onOpenNewAppointment}
              className="text-sky-600 font-medium hover:underline"
            >
              + Agregar turno rápido
            </button>
          </div>
        </div>

        {/* Right Col: AI Assistant Simulator Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Sofía • Asistente IA</h3>
                    <p className="text-[11px] text-neutral-400">Potenciada por Gemini 3.8 Flash</p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                La asistente virtual responde automáticamente dudas sobre tratamientos, aranceles y horarios, y agenda turnos de pacientes en lenguaje natural.
              </p>

              <div className="p-3 bg-white/10 rounded-xl text-xs text-neutral-200 space-y-2 border border-white/10 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Estado del bot:</span>
                  <span className="text-emerald-400 font-medium">Activo 24/7</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Servicios activos:</span>
                  <span>{services.filter(s => s.active).length} tratamientos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Auto-agendamiento:</span>
                  <span className="text-emerald-400">Habilitado</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('asistente')}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Abrir Simulador WhatsApp IA
            </button>
          </div>

          {/* Quick Access Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-neutral-900">Accesos Directos</h4>
              <button
                onClick={() => onNavigateToTab('espera')}
                className="text-[11px] text-amber-700 font-bold hover:underline flex items-center gap-1"
              >
                <ListOrdered className="w-3 h-3" />
                Lista de Espera ({waitingList.length})
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateToTab('recordatorios')}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-colors"
              >
                <Bell className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="font-semibold text-neutral-900 block">Recordatorios</span>
                <span className="text-[11px] text-emerald-800 font-medium">WhatsApp & Email</span>
              </button>

              <button
                onClick={() => onNavigateToTab('espera')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-left transition-colors"
              >
                <ListOrdered className="w-4 h-4 text-amber-600 mb-1" />
                <span className="font-semibold text-neutral-900 block">Lista Espera</span>
                <span className="text-[11px] text-amber-700 font-medium">{waitingList.length} en espera</span>
              </button>

              <button
                onClick={() => onNavigateToTab('pacientes')}
                className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <Users className="w-4 h-4 text-teal-600 mb-1" />
                <span className="font-semibold text-neutral-900 block">Fichas</span>
                <span className="text-[11px] text-neutral-500">Historiales</span>
              </button>

              <button
                onClick={() => onNavigateToTab('servicios')}
                className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <DollarSign className="w-4 h-4 text-sky-600 mb-1" />
                <span className="font-semibold text-neutral-900 block">Aranceles</span>
                <span className="text-[11px] text-neutral-500">Precios y duración</span>
              </button>

              <button
                onClick={() => onNavigateToTab('horarios')}
                className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <Clock className="w-4 h-4 text-purple-600 mb-1" />
                <span className="font-semibold text-neutral-900 block">Disponibilidad</span>
                <span className="text-[11px] text-neutral-500">Horarios y pausas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
