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
  Receipt,
  ArrowRight,
  Compass
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

  const isProfileComplete = Boolean(practiceSettings.practice_name?.trim() && practiceSettings.professional_name?.trim() && practiceSettings.phone?.trim());
  const isServicesComplete = services.some(s => s.active);
  const hasEssentialPending = !isProfileComplete || !isServicesComplete;

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions - Sleek, borderless minimalist architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
              {practiceSettings.practice_name}
            </h1>
            <span className="text-xs text-neutral-500 font-medium px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200/60">
              {practiceSettings.specialty}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
            <span>Portal público:</span>
            <button
              onClick={() => onNavigateToTab('portal')}
              className="text-neutral-800 hover:text-sky-600 font-medium inline-flex items-center gap-1 transition-colors hover:underline"
            >
              <span>agendapro.ai/u/{practiceSettings.handle}</span>
              <ExternalLink className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigateToTab('guia')}
            className="px-3 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
            title="Ver pasos de puesta en marcha"
          >
            <Compass className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Guía de Inicio</span>
          </button>
          <button
            onClick={() => onNavigateToTab('portal')}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            <span>Portal Pacientes</span>
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Turno</span>
          </button>
        </div>
      </div>

      {/* Non-intrusive alert when essential setup steps are missing */}
      {hasEssentialPending && (
        <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              <strong>Paso pendiente:</strong> {!isServicesComplete ? 'Configura tus aranceles de consulta' : 'Completa tus datos de atención'} para habilitar turnos online.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('guia')}
            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-[11px] font-semibold transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1"
          >
            <span>Abrir Guía</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Metrics Row - Minimalist, refined cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight">Turnos de Hoy</span>
            <Calendar className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight font-display">
            {todayAppointments.length}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {todayAppointments.filter(a => a.status === 'confirmed').length} confirmados • {todayAppointments.filter(a => a.status === 'completed').length} atendidos
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight">Pacientes Registrados</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight font-display">
            {patients.length}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            +3 pacientes nuevos esta semana
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab('cobros')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight group-hover:text-neutral-900 transition-colors">Cobrado en el Mes</span>
            <DollarSign className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 tracking-tight">
            ${monthCollected.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-neutral-500 group-hover:text-neutral-800 font-medium mt-1 flex items-center gap-1">
            <span>Ver caja y recibos</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight">Asistente IA WhatsApp</span>
            <Sparkles className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2 font-display">
            <span>24/7</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
              Activo
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Respuestas y agenda automatizada
          </p>
        </div>
      </div>

      {/* Main Grid: Today's Agenda + AI Assistant Quick Box */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Today's Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200/75 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-900 font-display">Agenda para Hoy</h2>
                <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-medium">
                  {todayAppointments.length} turnos
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('agenda')}
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors"
              >
                <span>Ver calendario completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
                <p className="text-sm">No hay turnos registrados para hoy.</p>
                <button
                  onClick={onOpenNewAppointment}
                  className="mt-3 text-xs text-neutral-900 font-semibold hover:underline"
                >
                  + Agendar un turno ahora
                </button>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {todayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-center shrink-0 w-14 bg-neutral-50 border border-neutral-200/60 rounded-lg p-1.5">
                        <span className="block text-xs font-bold text-neutral-900">{formatHour(apt.start_datetime)}</span>
                        <span className="block text-[10px] text-neutral-400">{formatHour(apt.end_datetime)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-neutral-900">{apt.patient_name}</span>
                          {getStatusBadge(apt.status)}
                          {apt.patient_confirmed && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold">
                              <CheckCheck className="w-3 h-3 text-emerald-600" /> Confirmado
                            </span>
                          )}
                          {apt.origin === 'telemedicine' && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded border border-neutral-200 font-medium">
                              <Video className="w-3 h-3" /> Online
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-neutral-600">
                            {apt.service_name} • ${apt.service_price?.toLocaleString()}
                          </p>
                          {apt.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-medium">
                              • Pagado
                            </span>
                          ) : (
                            <button
                              onClick={() => onNavigateToTab('cobros')}
                              className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 hover:text-amber-800 font-medium transition-colors"
                              title="Ir a registrar cobro"
                            >
                              • Sin cobrar
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
                        className="p-1.5 text-neutral-400 hover:text-emerald-700 hover:bg-neutral-100 rounded-md transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {apt.status !== 'completed' && (
                        <button
                          onClick={() => updateAppointment(apt.id, { status: 'completed' })}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                          title="Marcar como atendido"
                        >
                          Atender
                        </button>
                      )}

                      <button
                        onClick={() => onEditAppointment(apt)}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-md transition-colors"
                      >
                        Detalle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
            <span>Zona horaria: GMT-3 (Buenos Aires)</span>
            <button
              onClick={onOpenNewAppointment}
              className="text-neutral-800 font-semibold hover:underline"
            >
              + Agregar turno rápido
            </button>
          </div>
        </div>

        {/* Right Col: AI Assistant Simulator Card & Quick Links */}
        <div className="space-y-4">
          <div className="bg-zinc-900 text-white rounded-xl p-5 shadow-2xs border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white/10 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase font-display">Sofía • IA WhatsApp</h3>
                    <p className="text-[10px] text-neutral-400">Modelo Gemini 3.8 Flash</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                Atención clínica 24/7: responde consultas de pacientes, cotiza tratamientos y sincroniza turnos en tiempo real.
              </p>

              <div className="p-3 bg-white/5 rounded-lg text-xs text-neutral-300 space-y-2 border border-white/5 mb-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Disponibilidad:</span>
                  <span className="text-emerald-400 font-medium">Ininterrumpida</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Servicios activos:</span>
                  <span>{services.filter(s => s.active).length} tratamientos</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('asistente')}
              className="w-full py-2 px-3 bg-white text-zinc-900 hover:bg-neutral-100 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Probar Asistente IA
            </button>
          </div>

          {/* Quick Access Minimal Card */}
          <div className="bg-white rounded-xl border border-neutral-200/75 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h4 className="text-xs font-semibold text-neutral-900 tracking-tight">Accesos Directos</h4>
              <button
                onClick={() => onNavigateToTab('espera')}
                className="text-[11px] text-neutral-600 font-medium hover:text-neutral-900"
              >
                Espera ({waitingList.length})
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateToTab('recordatorios')}
                className="p-2.5 rounded-lg border border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <span className="font-semibold text-neutral-900 block text-xs">Recordatorios</span>
                <span className="text-[10px] text-neutral-500">Automáticos</span>
              </button>

              <button
                onClick={() => onNavigateToTab('espera')}
                className="p-2.5 rounded-lg border border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <ListOrdered className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <span className="font-semibold text-neutral-900 block text-xs">Lista Espera</span>
                <span className="text-[10px] text-neutral-500">{waitingList.length} registrados</span>
              </button>

              <button
                onClick={() => onNavigateToTab('pacientes')}
                className="p-2.5 rounded-lg border border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <span className="font-semibold text-neutral-900 block text-xs">Pacientes</span>
                <span className="text-[10px] text-neutral-500">Historias clínicas</span>
              </button>

              <button
                onClick={() => onNavigateToTab('cobros')}
                className="p-2.5 rounded-lg border border-neutral-200/70 hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <span className="font-semibold text-neutral-900 block text-xs">Caja & Cobros</span>
                <span className="text-[10px] text-neutral-500">Aranceles</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
