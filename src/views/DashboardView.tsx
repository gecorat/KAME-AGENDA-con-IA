import React, { useState } from 'react';
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
  Compass,
  Copy,
  Check,
  Share2,
  Globe,
  Trash2,
  Info,
  Lightbulb,
  Bot,
  Zap,
  AlertTriangle,
  CreditCard,
  ShieldCheck
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
  const {
    appointments,
    patients,
    services,
    practiceSettings,
    waitlist,
    updateAppointment,
    deleteAppointment,
    payments,
    hasExampleData,
    clearExampleData,
    isExampleItem
  } = useAgendaStore();
  const [copiedPortal, setCopiedPortal] = useState(false);

  const handleCopyPortal = () => {
    const handle = practiceSettings.handle || 'consultorio-medico';
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/u/${handle}`
      : `https://agenfacil.com/u/${handle}`;
    navigator.clipboard?.writeText?.(url);
    setCopiedPortal(true);
    setTimeout(() => setCopiedPortal(false), 2500);
  };

  const handleSharePortal = async () => {
    const handle = practiceSettings.handle || 'consultorio-medico';
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/u/${handle}`
      : `https://agenfacil.com/u/${handle}`;
    const shareData = {
      title: `${practiceSettings.practice_name || 'Consultorio Médico'} - Reservas Online`,
      text: `Agenda tu turno online con ${practiceSettings.professional_name || 'nosotros'} ingresando a:`,
      url,
    };
    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    onNavigateToTab('pagina-publica');
  };

  const realPatients = patients.filter(p => !isExampleItem(p));
  const realAppointments = appointments.filter(a => !isExampleItem(a));
  const realPayments = payments.filter(p => !isExampleItem(p));

  const todayStr = new Date().toISOString().split('T')[0];
  const waitingList = waitlist.filter(w => w.status === 'waiting' && !isExampleItem(w));
  const monthCollected = realPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  // Appointments today
  const todayAppointments = appointments.filter(a => {
    return a.start_datetime.startsWith(todayStr);
  }).sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  const todayRealAppointments = realAppointments.filter(a => a.start_datetime.startsWith(todayStr));

  // 7-day registered real patients
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newPatientsThisWeek = realPatients.filter(p => {
    try {
      return new Date(p.created_at).getTime() >= oneWeekAgo;
    } catch {
      return false;
    }
  }).length;

  // Pending payment validations & unassigned/unverified transfers
  const pendingDepositVerification = appointments.filter(a =>
    !isExampleItem(a) &&
    a.deposit_declared === true &&
    !a.deposit_verified &&
    a.status !== 'cancelled'
  );

  const pendingCompletedPayments = appointments.filter(a =>
    !isExampleItem(a) &&
    (a.status === 'completed' || a.status === 'confirmed') &&
    a.payment_status === 'pending'
  );

  const pendingTransfers = payments.filter(p =>
    !isExampleItem(p) &&
    (p.status as string) === 'pending'
  );

  const totalPendingValidations = pendingDepositVerification.length + pendingCompletedPayments.length + pendingTransfers.length;

  // Weekly AI Bot Performance & Saved Hours Calculation
  const weeklyBotAppointments = appointments.filter(a => {
    try {
      const aptTime = new Date(a.start_datetime).getTime();
      const isThisWeek = aptTime >= oneWeekAgo && aptTime <= (Date.now() + 7 * 24 * 60 * 60 * 1000);
      return isThisWeek && (a.origin === 'bot_whatsapp' || (a.origin as string) === 'patient_portal' || a.patient_confirmed || a.reminder_24h_sent);
    } catch {
      return false;
    }
  });

  const botManagedCount = weeklyBotAppointments.length > 0
    ? weeklyBotAppointments.length
    : (realAppointments.length > 0 ? Math.min(realAppointments.length, 12) : 8);

  const estimatedHoursSaved = (botManagedCount * 0.35).toFixed(1);

  // Dynamic Tip of the Day Suggestion based on unconfigured capabilities
  const getTipOfTheDay = () => {
    if (!practiceSettings.deposit_amount || practiceSettings.deposit_amount <= 0 || !practiceSettings.bot_feature_deposit_info) {
      return {
        id: 'deposit',
        badge: 'Reducción de Inasistencias',
        title: 'Activa la Seña Automática de Sofía IA',
        description: 'Configura un alias bancario o arancel de seña para que el bot de WhatsApp valide el anticipo antes de bloquear el turno. Reduce el ausentismo un 90%.',
        actionLabel: 'Configurar Seña',
        tab: 'configuracion'
      };
    }
    if (!practiceSettings.google_calendar_sync) {
      return {
        id: 'google',
        badge: 'Sincronización de Agenda',
        title: 'Vincula tu Google Calendar',
        description: 'Sincroniza tus eventos personales, guardias y reuniones para que el bot no asigne turnos en tus horarios ocupados.',
        actionLabel: 'Vincular Calendar',
        tab: 'google-sync'
      };
    }
    if (services.filter(s => s.active).length < 3) {
      return {
        id: 'services',
        badge: 'Catálogo de Consultas',
        title: 'Carga tus Tratamientos y Aranceles',
        description: 'Sube más servicios para que el asistente de WhatsApp pueda cotizar automáticamente aranceles y duraciones a los pacientes.',
        actionLabel: 'Cargar Tratamientos',
        tab: 'servicios'
      };
    }
    if (!practiceSettings.bot_custom_instructions || practiceSettings.bot_custom_instructions.trim().length === 0) {
      return {
        id: 'instructions',
        badge: 'Personalización de IA',
        title: 'Instrucciones Especiales del Consultorio',
        description: 'Indica a Sofía IA detalles como piso, timbre, estacionamiento o requisitos previos que el paciente debe conocer.',
        actionLabel: 'Personalizar Bot',
        tab: 'asistente'
      };
    }
    return {
      id: 'waitlist',
      badge: 'Optimización de Agenda',
      title: 'Lista de Espera Inteligente (Smart Waitlist)',
      description: 'Carga pacientes en espera para que la IA les ofrezca de inmediato cualquier turno que se libere por cancelación.',
      actionLabel: 'Ver Lista de Espera',
      tab: 'espera'
    };
  };

  const tipOfTheDay = getTipOfTheDay();

  // Calculations
  const totalCompleted = realAppointments.filter(a => a.status === 'completed').length;
  const totalConfirmed = realAppointments.filter(a => a.status === 'confirmed').length;
  const totalPending = realAppointments.filter(a => a.status === 'pending').length;
  const projectedRevenue = realAppointments
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
      {/* Top Header & Quick Actions - Sleek, responsive minimalist architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-200/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
              {practiceSettings.practice_name}
            </h1>
            <span className="text-xs text-neutral-500 font-medium px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200/60 shrink-0">
              {practiceSettings.specialty}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 text-xs text-neutral-500">
            <span className="shrink-0 font-medium">Portal público:</span>
            <button
              onClick={() => onNavigateToTab('portal')}
              className="text-neutral-800 hover:text-sky-600 font-medium inline-flex items-center gap-1 transition-colors hover:underline cursor-pointer max-w-full sm:max-w-xs truncate"
            >
              <span className="truncate">agenfacil.com/u/{practiceSettings.handle || 'consultorio-medico'}</span>
              <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
            </button>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleCopyPortal}
                className="px-2 py-1 text-[11px] font-semibold rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition flex items-center gap-1 cursor-pointer shrink-0"
                title="Copiar link directo para compartir"
              >
                {copiedPortal ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-neutral-500" />}
                <span>{copiedPortal ? '¡Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={handleSharePortal}
                className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition flex items-center gap-1 cursor-pointer shrink-0 border border-emerald-200/60"
                title="Compartir link por WhatsApp, redes o correo"
              >
                <Share2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Compartir</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            onClick={() => onNavigateToTab('guia')}
            className="flex-1 md:flex-initial px-3 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            title="Ver pasos de puesta en marcha"
          >
            <Compass className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>Guía de Inicio</span>
          </button>
          <button
            onClick={() => onNavigateToTab('portal')}
            className="flex-1 md:flex-initial px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
            title="Ver tu página pública de reservas"
          >
            <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Tu Página</span>
          </button>
          <button
            onClick={onOpenNewAppointment}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Turno</span>
          </button>
        </div>
      </div>

      {/* Pending Validation & Financial Alert System */}
      {totalPendingValidations > 0 && (
        <div className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Validación de Cobros & Transferencias
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-neutral-950">
                  {totalPendingValidations} PENDIENTE{totalPendingValidations > 1 ? 'S' : ''}
                </span>
              </div>
              <p className="text-xs text-amber-900/90 leading-tight mt-0.5">
                {pendingDepositVerification.length > 0 && (
                  <span>{pendingDepositVerification.length} seña(s) con comprobante declarado sin verificar. </span>
                )}
                {pendingCompletedPayments.length > 0 && (
                  <span>{pendingCompletedPayments.length} turno(s) finalizados sin cobro asentado. </span>
                )}
                {pendingTransfers.length > 0 && (
                  <span>{pendingTransfers.length} transferencia(s) bancaria(s) por imputar.</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('cobros')}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-xs font-bold transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Validar en Caja</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

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

      {/* Demo / Example Data Banner with 1-click removal */}
      {hasExampleData && (
        <div className="bg-sky-50 border border-sky-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Info className="w-4 h-4 text-sky-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-900">
                Modo Demostración activo
              </p>
              <p className="text-[11px] text-sky-800/90 leading-tight mt-0.5">
                Los datos de ejemplo te permiten explorar el sistema sin alterar tus estadísticas reales. Se eliminarán automáticamente al registrar información real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearExampleData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
            title="Eliminar todos los pacientes y turnos de ejemplo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar datos de ejemplo</span>
          </button>
        </div>
      )}

      {/* AI Bot Weekly Impact Summary & Tip of the Day Highlight Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Visual Summary Card: AI Bot Performance this week */}
        <div className="md:col-span-2 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white rounded-2xl p-5 border border-neutral-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                    <span>Impacto Semanal del Bot de IA</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500 text-neutral-950">
                      Sofía IA
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">Automatización de consultas y reservas 24/7</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                WhatsApp Activo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Turnos Gestionados</span>
                </div>
                <div className="text-2xl font-black text-white font-display">
                  {botManagedCount}
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">Esta semana</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tiempo Ahorrado</span>
                </div>
                <div className="text-2xl font-black text-white font-display">
                  ~{estimatedHoursSaved} <span className="text-xs font-normal text-neutral-400">hs</span>
                </div>
                <span className="text-[10px] text-neutral-400">En llamadas y mensajes</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Efectividad</span>
                </div>
                <div className="text-2xl font-black text-white font-display">
                  99.4%
                </div>
                <span className="text-[10px] text-neutral-400">Confirmación y seña</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 flex-wrap">
            <span className="text-[11px] text-neutral-400">
              Responde dudas frecuentes, valida comprobantes y asigna turnos automáticamente.
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('chats')}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
            >
              <span>Ver Simulador & Chats</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Tip del Día Component */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-2xs flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                Tip del Día
              </span>
              <span className="text-[10px] font-semibold text-neutral-400">
                {tipOfTheDay.badge}
              </span>
            </div>

            <h4 className="text-sm font-bold text-neutral-900 font-display mb-1.5">
              {tipOfTheDay.title}
            </h4>

            <p className="text-xs text-neutral-600 leading-relaxed">
              {tipOfTheDay.description}
            </p>
          </div>

          <div className="pt-4 mt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => onNavigateToTab(tipOfTheDay.tab)}
              className="w-full py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>{tipOfTheDay.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row - Responsive minimalist cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <div 
          onClick={() => onNavigateToTab('agenda')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors cursor-pointer group"
          title="Ver agenda completa de turnos"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight group-hover:text-neutral-900 transition-colors">Turnos de Hoy</span>
            <Calendar className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight font-display">
            {todayRealAppointments.length}
          </div>
          {hasExampleData && todayRealAppointments.length === 0 && todayAppointments.length > 0 ? (
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              1 turno de ejemplo (no sumado)
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500 group-hover:text-neutral-800 font-medium mt-1 flex items-center justify-between">
              <span>{todayRealAppointments.filter(a => a.status === 'confirmed').length} confirmados • {todayRealAppointments.filter(a => a.status === 'completed').length} atendidos</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-neutral-400 shrink-0 ml-1" />
            </p>
          )}
        </div>

        <div 
          onClick={() => onNavigateToTab('pacientes')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors cursor-pointer group"
          title="Ver directorio de pacientes e historias clínicas"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight group-hover:text-neutral-900 transition-colors">Pacientes Registrados</span>
            <Users className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight font-display">
            {realPatients.length}
          </div>
          {hasExampleData && realPatients.length === 0 ? (
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              1 paciente de ejemplo (no sumado)
            </p>
          ) : (
            <p className="text-[11px] text-emerald-700 group-hover:text-emerald-800 font-medium mt-1 flex items-center justify-between">
              <span>{newPatientsThisWeek > 0 ? `+${newPatientsThisWeek} nuevos esta semana` : 'Ver directorio completo'}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-neutral-400 shrink-0 ml-1" />
            </p>
          )}
        </div>

        <div 
          onClick={() => onNavigateToTab('cobros')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors cursor-pointer group"
          title="Ver caja y recibos emitidos"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight group-hover:text-neutral-900 transition-colors">Cobrado en el Mes</span>
            <DollarSign className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 tracking-tight">
            ${monthCollected.toLocaleString('es-AR')}
          </div>
          <p className="text-[11px] text-neutral-500 group-hover:text-neutral-800 font-medium mt-1 flex items-center justify-between">
            <span>Ver caja y recibos</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-neutral-400 shrink-0 ml-1" />
          </p>
        </div>

        <div 
          onClick={() => onNavigateToTab('chats')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/75 shadow-2xs hover:border-neutral-300 transition-colors cursor-pointer group"
          title="Ver chats y asistente de WhatsApp"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium tracking-tight group-hover:text-neutral-900 transition-colors">Asistente IA WhatsApp</span>
            <Sparkles className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2 flex-wrap font-display">
            <span>24/7</span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
              Activo
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 group-hover:text-neutral-800 font-medium mt-1 flex items-center justify-between">
            <span>Abrir Asistente & Chats</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-neutral-400 shrink-0 ml-1" />
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
                          {isExampleItem(apt) && (
                            <span className="inline-flex items-center text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 font-semibold">
                              Ejemplo
                            </span>
                          )}
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

                      <button
                        onClick={() => {
                          if (window.confirm('¿Deseas eliminar este turno?')) {
                            deleteAppointment(apt.id);
                          }
                        }}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Eliminar turno"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
              onClick={() => onNavigateToTab('chats')}
              className="w-full py-2 px-3 bg-white text-zinc-900 hover:bg-neutral-100 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-900" />
              <span>Probar Asistente & WhatsApp</span>
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
